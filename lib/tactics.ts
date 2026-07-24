import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { describeHangingPieceReason, detectHangingPiece } from './hangingPiece'
import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'
import { PIECE_VALUES } from './material'
import { describeMove, pieceName, pieceWithArticle } from './san'
import type { BestMove, BlunderReason, ForkReason, MyColor, PinReason } from './types'

// "a"/"al" is a genuine preposition here (expose the king TO the bishop),
// not the optional personal-a for a direct object, so it can't just be
// dropped like the direct-object "a" is everywhere else in this file —
// contracts "a" + "el X" -> "al X", leaves "a" + "la X" as-is.
function withPreposition(articled: string): string {
  return articled.startsWith('el ') ? `al ${articled.slice(3)}` : `a ${articled}`
}

function toColor(color: MyColor): Color {
  return color === 'white' ? 'w' : 'b'
}

// chess.js only generates moves for the side whose turn the FEN says it is.
// Forcing the turn field lets us ask "what does this color's pieces attack
// right now" regardless of whose move it actually is — same "isAttacked is
// turn-independent" trick hangingSquares() already relies on, just applied
// per-piece instead of per-square. En passant is cleared since it's only
// ever valid for whichever side the FEN actually says is to move.
function withTurn(fen: string, color: Color): string {
  const [board, , castling, , halfmove, fullmove] = fen.split(' ')
  return [board, color, castling, '-', halfmove, fullmove].join(' ')
}

interface Forker {
  square: Square
  piece: PieceSymbol
  targets: { square: Square; piece: PieceSymbol }[]
}

/** Every `color` piece currently attacking 2+ enemy pieces at once —
 *  filtered to forks with at least one non-pawn target, since two attacked
 *  pawns alone (e.g. a rook on an open file) is common and rarely the
 *  actual tactical point. */
function forkers(fen: string, color: Color): Forker[] {
  const chess = new Chess(withTurn(fen, color))
  const found: Forker[] = []

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color) continue
      const targets = chess
        .moves({ square: cell.square, verbose: true })
        .filter((m) => m.captured)
        .map((m) => ({ square: m.to as Square, piece: m.captured as PieceSymbol }))
      if (targets.length >= 2 && targets.some((t) => (PIECE_VALUES[t.piece] ?? 0) > 1)) {
        found.push({ square: cell.square, piece: cell.type, targets })
      }
    }
  }
  return found
}

/**
 * Whether the mover's move newly allowed the opponent to fork them — a
 * single opponent piece now attacking 2+ of the mover's pieces at once that
 * wasn't already doing so before this move. One-ply lookback only, same
 * scope `detectHangingPiece` uses — not "could the opponent maneuver into a
 * fork over the next few moves."
 */
export function detectFork(
  fenBefore: string,
  fenAfter: string,
  moverColor: MyColor,
): ForkReason | null {
  const opponent = toColor(moverColor === 'white' ? 'black' : 'white')
  const before = forkers(fenBefore, opponent)
  const after = forkers(fenAfter, opponent)

  const newForks = after.filter((f) => !before.some((b) => b.square === f.square))
  if (newForks.length === 0) return null

  const value = (f: Forker) => f.targets.reduce((sum, t) => sum + (PIECE_VALUES[t.piece] ?? 0), 0)
  const worst = newForks.reduce((best, f) => (value(f) > value(best) ? f : best))

  return {
    kind: 'fork',
    attackerPiece: worst.piece,
    attackerSquare: worst.square,
    targets: worst.targets.map((t) => ({ piece: t.piece, square: t.square })),
  }
}

function targetList(targets: ForkReason['targets'], locale: Locale): string {
  const preposition = locale === 'es' ? 'en' : 'on'
  const joiner = locale === 'es' ? ' y ' : ' and '
  return targets
    .map((t) => `${pieceWithArticle(t.piece as PieceSymbol, locale)} ${preposition} ${t.square}`)
    .join(joiner)
}

export function describeForkReason(reason: ForkReason, locale: Locale = getLocale()): string {
  const attacker = pieceWithArticle(reason.attackerPiece as PieceSymbol, locale)
  return locale === 'es'
    ? `Esto permite una horquilla — ${attacker} en ${reason.attackerSquare} ahora ataca ${targetList(reason.targets, locale)} a la vez.`
    : `This allows a fork — ${attacker} on ${reason.attackerSquare} now attacks ${targetList(reason.targets, locale)} at once.`
}

const ROOK_DIRECTIONS: readonly [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
]
const BISHOP_DIRECTIONS: readonly [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

function squareCoords(square: Square): [number, number] {
  return [square.charCodeAt(0) - 97, Number(square[1]) - 1]
}

function coordsSquare(file: number, rank: number): Square {
  return (String.fromCharCode(97 + file) + (rank + 1)) as Square
}

interface Pin {
  pinnedSquare: Square
  pinnedPiece: PieceSymbol
  pinnerSquare: Square
  pinnerPiece: PieceSymbol
}

/** Every `color` piece currently pinned to its own king by an enemy sliding
 *  piece — **absolute pins only** (relative pins, e.g. a knight pinned to a
 *  queen rather than the king, are out of scope for this v1 heuristic, same
 *  "narrow on purpose" precedent as hanging-piece/fork detection). Rays out
 *  from the king in all 8 directions; the first own-color piece found on a
 *  ray is pinned only if the *next* piece past it is an enemy slider whose
 *  movement matches that ray's direction (rook/queen on a straight ray,
 *  bishop/queen on a diagonal one) — a second piece of either color in
 *  between (or no further piece at all) means nothing on that ray is
 *  pinned. */
function pinnedPieces(fen: string, color: Color): Pin[] {
  const chess = new Chess(fen)
  const king = chess
    .board()
    .flat()
    .find((cell) => cell && cell.type === 'k' && cell.color === color)
  if (!king) return []

  const opponent: Color = color === 'w' ? 'b' : 'w'
  const [kingFile, kingRank] = squareCoords(king.square)
  const found: Pin[] = []

  for (const [directions, sliderTypes] of [
    [ROOK_DIRECTIONS, ['r', 'q']],
    [BISHOP_DIRECTIONS, ['b', 'q']],
  ] as const) {
    for (const [df, dr] of directions) {
      let file = kingFile + df
      let rank = kingRank + dr
      let blocker: { square: Square; piece: PieceSymbol } | null = null

      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const square = coordsSquare(file, rank)
        const piece = chess.get(square)
        if (piece) {
          if (!blocker) {
            if (piece.color !== color) break // enemy piece blocks the ray directly — no pin
            blocker = { square, piece: piece.type }
          } else {
            if (
              piece.color === opponent &&
              (sliderTypes as readonly string[]).includes(piece.type)
            ) {
              found.push({
                pinnedSquare: blocker.square,
                pinnedPiece: blocker.piece,
                pinnerSquare: square,
                pinnerPiece: piece.type,
              })
            }
            break
          }
        }
        file += df
        rank += dr
      }
    }
  }
  return found
}

/**
 * Whether the mover's move newly pinned one of their own pieces to their
 * king (an absolute pin by an enemy bishop/rook/queen) that wasn't already
 * pinned before this move — same one-ply-lookback, before/after-diff shape
 * as `detectHangingPiece`/`detectFork`.
 */
export function detectPin(
  fenBefore: string,
  fenAfter: string,
  moverColor: MyColor,
): PinReason | null {
  const color = toColor(moverColor)
  const before = pinnedPieces(fenBefore, color)
  const after = pinnedPieces(fenAfter, color)

  const newPins = after.filter((p) => !before.some((b) => b.pinnedSquare === p.pinnedSquare))
  if (newPins.length === 0) return null

  const value = (p: Pin) => PIECE_VALUES[p.pinnedPiece] ?? 0
  const worst = newPins.reduce((best, p) => (value(p) > value(best) ? p : best))

  return {
    kind: 'pin',
    pinnedPiece: worst.pinnedPiece,
    pinnedSquare: worst.pinnedSquare,
    pinnerPiece: worst.pinnerPiece,
    pinnerSquare: worst.pinnerSquare,
  }
}

export function describePinReason(reason: PinReason, locale: Locale = getLocale()): string {
  const pinned = pieceWithArticle(reason.pinnedPiece as PieceSymbol, locale)
  const pinner = pieceWithArticle(reason.pinnerPiece as PieceSymbol, locale)
  return locale === 'es'
    ? `Esto clava ${pinned} en ${reason.pinnedSquare} al rey — no puede moverse sin exponer el rey ${withPreposition(pinner)} en ${reason.pinnerSquare}.`
    : `This pins ${pinned} on ${reason.pinnedSquare} to the king — it can't move without exposing the king to ${pinner} on ${reason.pinnerSquare}.`
}

/** Tries `detectHangingPiece` first, then `detectFork`, then `detectPin` —
 *  the one function every call site uses instead of running the three
 *  detectors individually and merging the results itself. */
export function detectBlunderReason(
  fenBefore: string,
  fenAfter: string,
  moverColor: MyColor,
): BlunderReason | null {
  return (
    detectHangingPiece(fenBefore, fenAfter, moverColor) ??
    detectFork(fenBefore, fenAfter, moverColor) ??
    detectPin(fenBefore, fenAfter, moverColor)
  )
}

export function describeBlunderReason(reason: BlunderReason, locale: Locale = getLocale()): string {
  if (reason.kind === 'hanging-piece') return describeHangingPieceReason(reason, locale)
  if (reason.kind === 'fork') return describeForkReason(reason, locale)
  return describePinReason(reason, locale)
}

/**
 * Why the engine's suggested move is better, if a simple tactical pattern
 * explains it — reuses `detectHangingPiece`/`detectFork`/`detectPin` on the
 * *candidate* move rather than the one actually played. Checking with the
 * FEN order swapped turns "newly hanging/forked/pinned after" into "no
 * longer hanging/forked/pinned after" — `detectHangingPiece(fenAfter,
 * fenBefore, moverColor)` diffs hanging squares in `fenBefore` against
 * `fenAfter` in the reverse of its normal direction, so what it reports as
 * "new" is really "resolved" (same trick for the other two detectors).
 * Checked defensive-first (saving/escaping explains a forced move) then
 * offensive (winning/forking/pinning is a bonus); returns null for a quiet
 * improvement none of the detectors explain, same as they don't explain
 * every blunder either.
 */
export function explainBestMove(
  fenBefore: string,
  bestMoveSan: string,
  moverColor: MyColor,
  locale: Locale = getLocale(),
): string | null {
  let fenAfter: string
  try {
    fenAfter = new Chess(fenBefore).move(bestMoveSan).after
  } catch {
    return null
  }
  const opponent: MyColor = moverColor === 'white' ? 'black' : 'white'
  const es = locale === 'es'

  const saved = detectHangingPiece(fenAfter, fenBefore, moverColor)
  if (saved) {
    const piece = pieceWithArticle(saved.piece as PieceSymbol, locale)
    return es
      ? `Salva ${piece} en ${saved.square}, que estaba colgando.`
      : `Saves ${piece} on ${saved.square}, which was hanging.`
  }

  const escaped = detectFork(fenAfter, fenBefore, moverColor)
  if (escaped) {
    const targets = targetList(escaped.targets, locale)
    return es ? `Saca ${targets} de la horquilla.` : `Gets ${targets} out of the fork.`
  }

  const unpinned = detectPin(fenAfter, fenBefore, moverColor)
  if (unpinned) {
    const piece = pieceWithArticle(unpinned.pinnedPiece as PieceSymbol, locale)
    return es
      ? `Libera ${piece} en ${unpinned.pinnedSquare} de la clavada.`
      : `Frees ${piece} on ${unpinned.pinnedSquare} from the pin.`
  }

  const wins = detectHangingPiece(fenBefore, fenAfter, opponent)
  if (wins) {
    return es
      ? `Deja colgando ${pieceWithArticle(wins.piece as PieceSymbol, locale)} del rival en ${wins.square}.`
      : `Leaves the opponent's ${pieceName(wins.piece as PieceSymbol, locale).toLowerCase()} on ${wins.square} hanging.`
  }

  const forks = detectFork(fenBefore, fenAfter, opponent)
  if (forks) {
    const targets = targetList(forks.targets, locale)
    return es ? `Hace una horquilla sobre ${targets} a la vez.` : `Forks ${targets} at once.`
  }

  const pins = detectPin(fenBefore, fenAfter, opponent)
  if (pins) {
    return es
      ? `Clava ${pieceWithArticle(pins.pinnedPiece as PieceSymbol, locale)} del rival en ${pins.pinnedSquare} a su rey.`
      : `Pins the opponent's ${pieceName(pins.pinnedPiece as PieceSymbol, locale).toLowerCase()} on ${pins.pinnedSquare} to their king.`
  }

  return null
}

/**
 * Renders the engine's own expected continuation (`BestMove.bestLine`), if
 * any — this is what makes a quiet positional move legible: a hanging-piece
 * or fork explanation only exists for one-ply tactics, but a move whose
 * payoff is a few moves out has no such one-line "why". Seeing the plan
 * itself is the next best thing. `undefined`-safe: analyses saved before
 * this field existed simply have no plan to show.
 */
function formatPlan(bestLine: string[] | undefined): string | null {
  if (!bestLine || bestLine.length === 0) return null
  // "Plan" reads naturally in Spanish too (a common cognate in Spanish chess
  // commentary) — no separate translation needed for the lead-in word.
  return `Plan: ${bestLine.join(' ')}.`
}

/**
 * The full "better was ..." line — the mechanical description via the
 * existing `describeMove()`, the tactical "why" above when there is one,
 * and the engine's short follow-up plan when it has one. Null when there's
 * no engine suggestion or it matches what was actually played, so callers
 * can render conditionally without repeating that check themselves.
 */
export function describeBetterMove(
  fenBefore: string,
  moveSan: string,
  bestMove: BestMove | null,
  moverColor: MyColor,
  locale: Locale = getLocale(),
): string | null {
  if (!bestMove || bestMove.san === moveSan) return null
  const description = describeMove(fenBefore, bestMove.san, locale)
  const clauses = [
    explainBestMove(fenBefore, bestMove.san, moverColor, locale),
    formatPlan(bestMove.bestLine),
  ].filter((clause): clause is string => Boolean(clause))
  return clauses.length
    ? `${bestMove.san} (${description}) — ${clauses.join(' ')}`
    : `${bestMove.san} (${description})`
}
