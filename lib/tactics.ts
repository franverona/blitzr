import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { describeHangingPieceReason, detectHangingPiece } from './hangingPiece'
import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'
import { PIECE_VALUES } from './material'
import { describeMove, pieceName, pieceWithArticle } from './san'
import type { BestMove, BlunderReason, ForkReason, MyColor, PinReason, SkewerReason } from './types'

// Spanish "a" here is a real preposition (expose the king TO the bishop):
// "a" + "el X" contracts to "al X".
function withPreposition(articled: string): string {
  return articled.startsWith('el ') ? `al ${articled.slice(3)}` : `a ${articled}`
}

function toColor(color: MyColor): Color {
  return color === 'white' ? 'w' : 'b'
}

// chess.js only generates moves for the side to move, so force the turn to
// ask what `color` attacks. En passant is cleared since it'd be invalid.
function withTurn(fen: string, color: Color): string {
  const [board, , castling, , halfmove, fullmove] = fen.split(' ')
  return [board, color, castling, '-', halfmove, fullmove].join(' ')
}

export interface Forker {
  square: Square
  piece: PieceSymbol
  targets: { square: Square; piece: PieceSymbol }[]
}

/** Every `color` piece attacking 2+ enemy pieces, ignoring pawn-only forks. */
export function forkers(fen: string, color: Color): Forker[] {
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

/** Whether the move newly let the opponent fork the mover. One-ply lookback. */
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

export function targetList(targets: ForkReason['targets'], locale: Locale): string {
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

export interface Pin {
  pinnedSquare: Square
  pinnedPiece: PieceSymbol
  pinnerSquare: Square
  pinnerPiece: PieceSymbol
}

/** Every `color` piece absolutely pinned to its king (relative pins are out
 *  of scope). Rays out from the king: the first own piece is pinned if the
 *  next piece on the ray is an enemy slider moving along that ray. */
export function pinnedPieces(fen: string, color: Color): Pin[] {
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
            if (piece.color !== color) break
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

/** Whether the move newly pinned one of the mover's pieces to their king. */
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

export interface Skewer {
  attackerSquare: Square
  attackerPiece: PieceSymbol
  frontSquare: Square
  frontPiece: PieceSymbol
  backSquare: Square
  backPiece: PieceSymbol
}

/** Every `color` slider attacking two enemy pieces in line. Counted only when
 *  the front piece is the king or worth at least the back one, and the back
 *  piece is worth more than a pawn. */
export function skewers(fen: string, color: Color): Skewer[] {
  const chess = new Chess(fen)
  const opponent: Color = color === 'w' ? 'b' : 'w'
  const found: Skewer[] = []

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color) continue
      if (cell.type !== 'r' && cell.type !== 'b' && cell.type !== 'q') continue
      const directions =
        cell.type === 'r'
          ? ROOK_DIRECTIONS
          : cell.type === 'b'
            ? BISHOP_DIRECTIONS
            : [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS]
      const [startFile, startRank] = squareCoords(cell.square)

      for (const [df, dr] of directions) {
        let file = startFile + df
        let rank = startRank + dr
        let front: { square: Square; piece: PieceSymbol } | null = null

        while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
          const square = coordsSquare(file, rank)
          const piece = chess.get(square)
          if (piece) {
            if (!front) {
              if (piece.color !== opponent) break
              front = { square, piece: piece.type }
            } else {
              if (piece.color !== opponent) break
              // A king behind is a pin, not a skewer.
              if (piece.type === 'k') break
              const frontValue = PIECE_VALUES[front.piece] ?? 0
              const backValue = PIECE_VALUES[piece.type] ?? 0
              if (backValue > 1 && (front.piece === 'k' || frontValue >= backValue)) {
                found.push({
                  attackerSquare: cell.square,
                  attackerPiece: cell.type,
                  frontSquare: front.square,
                  frontPiece: front.piece,
                  backSquare: square,
                  backPiece: piece.type,
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
  }
  return found
}

/** Whether the move newly let the opponent skewer the mover. */
export function detectSkewer(
  fenBefore: string,
  fenAfter: string,
  moverColor: MyColor,
): SkewerReason | null {
  const opponent = toColor(moverColor === 'white' ? 'black' : 'white')
  const before = skewers(fenBefore, opponent)
  const after = skewers(fenAfter, opponent)

  const newSkewers = after.filter(
    (s) =>
      !before.some(
        (b) =>
          b.attackerSquare === s.attackerSquare &&
          b.frontSquare === s.frontSquare &&
          b.backSquare === s.backSquare,
      ),
  )
  if (newSkewers.length === 0) return null

  const value = (s: Skewer) => PIECE_VALUES[s.backPiece] ?? 0
  const worst = newSkewers.reduce((best, s) => (value(s) > value(best) ? s : best))

  return {
    kind: 'skewer',
    attackerPiece: worst.attackerPiece,
    attackerSquare: worst.attackerSquare,
    frontPiece: worst.frontPiece,
    frontSquare: worst.frontSquare,
    backPiece: worst.backPiece,
    backSquare: worst.backSquare,
  }
}

export function describeSkewerReason(reason: SkewerReason, locale: Locale = getLocale()): string {
  const front = pieceWithArticle(reason.frontPiece as PieceSymbol, locale)
  const attacker = pieceWithArticle(reason.attackerPiece as PieceSymbol, locale)
  const back = pieceWithArticle(reason.backPiece as PieceSymbol, locale)
  return locale === 'es'
    ? `Esto enfila ${front} en ${reason.frontSquare} — si se mueve, ${attacker} en ${reason.attackerSquare} captura ${back} en ${reason.backSquare}.`
    : `This skewers ${front} on ${reason.frontSquare} — if it moves, ${attacker} on ${reason.attackerSquare} captures ${back} on ${reason.backSquare}.`
}

/** Ordered by concreteness: hanging piece, fork, skewer, then pin. */
export function detectBlunderReason(
  fenBefore: string,
  fenAfter: string,
  moverColor: MyColor,
): BlunderReason | null {
  return (
    detectHangingPiece(fenBefore, fenAfter, moverColor) ??
    detectFork(fenBefore, fenAfter, moverColor) ??
    detectSkewer(fenBefore, fenAfter, moverColor) ??
    detectPin(fenBefore, fenAfter, moverColor)
  )
}

export function describeBlunderReason(reason: BlunderReason, locale: Locale = getLocale()): string {
  if (reason.kind === 'hanging-piece') return describeHangingPieceReason(reason, locale)
  if (reason.kind === 'fork') return describeForkReason(reason, locale)
  if (reason.kind === 'skewer') return describeSkewerReason(reason, locale)
  return describePinReason(reason, locale)
}

/**
 * Why the engine's move is better, if a simple pattern explains it. Calling a
 * detector with the FENs swapped turns "newly hanging/forked/..." into
 * "no longer ...". Defensive reasons are checked before offensive ones.
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

  const unskewered = detectSkewer(fenAfter, fenBefore, moverColor)
  if (unskewered) {
    const piece = pieceWithArticle(unskewered.frontPiece as PieceSymbol, locale)
    return es
      ? `Saca ${piece} en ${unskewered.frontSquare} de la enfilada.`
      : `Gets ${piece} on ${unskewered.frontSquare} out of the skewer.`
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

  const skewers = detectSkewer(fenBefore, fenAfter, opponent)
  if (skewers) {
    const back = pieceWithArticle(skewers.backPiece as PieceSymbol, locale)
    return es
      ? `Enfila ${pieceWithArticle(skewers.frontPiece as PieceSymbol, locale)} del rival en ${skewers.frontSquare}, con ${back} detrás en ${skewers.backSquare}.`
      : `Skewers the opponent's ${pieceName(skewers.frontPiece as PieceSymbol, locale).toLowerCase()} on ${skewers.frontSquare}, with ${back} behind it on ${skewers.backSquare}.`
  }

  const pins = detectPin(fenBefore, fenAfter, opponent)
  if (pins) {
    return es
      ? `Clava ${pieceWithArticle(pins.pinnedPiece as PieceSymbol, locale)} del rival en ${pins.pinnedSquare} a su rey.`
      : `Pins the opponent's ${pieceName(pins.pinnedPiece as PieceSymbol, locale).toLowerCase()} on ${pins.pinnedSquare} to their king.`
  }

  return null
}

function formatPlan(bestLine: string[] | undefined): string | null {
  if (!bestLine || bestLine.length === 0) return null
  return `Plan: ${bestLine.join(' ')}.`
}

/** The full "better was ..." text; null if there's no suggestion or it
 *  matches the move played. */
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
