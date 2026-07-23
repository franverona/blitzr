import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { describeHangingPieceReason, detectHangingPiece } from './hangingPiece'
import { PIECE_VALUES } from './material'
import { describeMove, PIECE_NAMES } from './san'
import type { BestMove, BlunderReason, ForkReason, MyColor, PinReason } from './types'

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

function targetList(targets: ForkReason['targets']): string {
  return targets
    .map((t) => `the ${PIECE_NAMES[t.piece as PieceSymbol].toLowerCase()} on ${t.square}`)
    .join(' and ')
}

export function describeForkReason(reason: ForkReason): string {
  const attacker = PIECE_NAMES[reason.attackerPiece as PieceSymbol].toLowerCase()
  return `This allows a fork — the ${attacker} on ${reason.attackerSquare} now attacks ${targetList(reason.targets)} at once.`
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

export function describePinReason(reason: PinReason): string {
  const pinned = PIECE_NAMES[reason.pinnedPiece as PieceSymbol].toLowerCase()
  const pinner = PIECE_NAMES[reason.pinnerPiece as PieceSymbol].toLowerCase()
  return `This pins the ${pinned} on ${reason.pinnedSquare} to the king — it can't move without exposing the king to the ${pinner} on ${reason.pinnerSquare}.`
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

export function describeBlunderReason(reason: BlunderReason): string {
  if (reason.kind === 'hanging-piece') return describeHangingPieceReason(reason)
  if (reason.kind === 'fork') return describeForkReason(reason)
  return describePinReason(reason)
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
): string | null {
  let fenAfter: string
  try {
    fenAfter = new Chess(fenBefore).move(bestMoveSan).after
  } catch {
    return null
  }
  const opponent: MyColor = moverColor === 'white' ? 'black' : 'white'

  const saved = detectHangingPiece(fenAfter, fenBefore, moverColor)
  if (saved) {
    return `Saves the ${PIECE_NAMES[saved.piece as PieceSymbol].toLowerCase()} on ${saved.square}, which was hanging.`
  }

  const escaped = detectFork(fenAfter, fenBefore, moverColor)
  if (escaped) return `Gets ${targetList(escaped.targets)} out of the fork.`

  const unpinned = detectPin(fenAfter, fenBefore, moverColor)
  if (unpinned) {
    return `Frees the ${PIECE_NAMES[unpinned.pinnedPiece as PieceSymbol].toLowerCase()} on ${unpinned.pinnedSquare} from the pin.`
  }

  const wins = detectHangingPiece(fenBefore, fenAfter, opponent)
  if (wins) {
    return `Leaves the opponent's ${PIECE_NAMES[wins.piece as PieceSymbol].toLowerCase()} on ${wins.square} hanging.`
  }

  const forks = detectFork(fenBefore, fenAfter, opponent)
  if (forks) return `Forks ${targetList(forks.targets)} at once.`

  const pins = detectPin(fenBefore, fenAfter, opponent)
  if (pins) {
    return `Pins the opponent's ${PIECE_NAMES[pins.pinnedPiece as PieceSymbol].toLowerCase()} on ${pins.pinnedSquare} to their king.`
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
): string | null {
  if (!bestMove || bestMove.san === moveSan) return null
  const description = describeMove(fenBefore, bestMove.san)
  const clauses = [
    explainBestMove(fenBefore, bestMove.san, moverColor),
    formatPlan(bestMove.bestLine),
  ].filter((clause): clause is string => Boolean(clause))
  return clauses.length
    ? `${bestMove.san} (${description}) — ${clauses.join(' ')}`
    : `${bestMove.san} (${description})`
}
