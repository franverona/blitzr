import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { describeHangingPieceReason, detectHangingPiece } from './hangingPiece'
import { PIECE_VALUES } from './material'
import { describeMove, PIECE_NAMES } from './san'
import type { BestMove, BlunderReason, ForkReason, MyColor } from './types'

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

/** Tries `detectHangingPiece` first, falling back to `detectFork` — the one
 *  function every call site uses instead of running the two detectors
 *  individually and merging the results itself. */
export function detectBlunderReason(
  fenBefore: string,
  fenAfter: string,
  moverColor: MyColor,
): BlunderReason | null {
  return (
    detectHangingPiece(fenBefore, fenAfter, moverColor) ??
    detectFork(fenBefore, fenAfter, moverColor)
  )
}

export function describeBlunderReason(reason: BlunderReason): string {
  return reason.kind === 'hanging-piece'
    ? describeHangingPieceReason(reason)
    : describeForkReason(reason)
}

/**
 * Why the engine's suggested move is better, if a simple tactical pattern
 * explains it — reuses `detectHangingPiece`/`detectFork` on the *candidate*
 * move rather than the one actually played. Checking with the FEN order
 * swapped turns "newly hanging/forked after" into "no longer hanging/forked
 * after" — `detectHangingPiece(fenAfter, fenBefore, moverColor)` diffs
 * hanging squares in `fenBefore` against `fenAfter` in the reverse of its
 * normal direction, so what it reports as "new" is really "resolved."
 * Checked defensive-first (saving/escaping explains a forced move) then
 * offensive (winning/forking is a bonus); returns null for a quiet
 * improvement neither detector explains, same as the two detectors
 * themselves not explaining every blunder.
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

  const wins = detectHangingPiece(fenBefore, fenAfter, opponent)
  if (wins) {
    return `Leaves the opponent's ${PIECE_NAMES[wins.piece as PieceSymbol].toLowerCase()} on ${wins.square} hanging.`
  }

  const forks = detectFork(fenBefore, fenAfter, opponent)
  if (forks) return `Forks ${targetList(forks.targets)} at once.`

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
