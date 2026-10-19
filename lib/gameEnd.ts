import { Chess } from 'chess.js'

export type GameEndVariant = 'loss' | 'flag' | 'win' | 'draw'

/** Keys into `s.board.endReasons`. */
export type GameEndReason =
  | 'checkmate'
  | 'winner'
  | 'draw'
  | 'resigned'
  | 'timeout'
  | 'abandoned'
  | 'lost'
  | 'agreed'
  | 'repetition'
  | 'timevsinsufficient'

export interface GameEndBadgeSpec {
  color: 'white' | 'black'
  variant: GameEndVariant
  reason: GameEndReason
}

const LOSS_REASONS = new Set<GameEndReason>(['resigned', 'timeout', 'abandoned'])
const DRAW_REASONS = new Set<GameEndReason>(['agreed', 'repetition', 'timevsinsufficient'])
// Chess.com's draw codes, plus a manual game's plain 'draw'.
const DRAW_CODES = new Set([
  'draw',
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
])

/**
 * Badges for the side(s) at `fen`. On-board mate/draw is read from the
 * position; `finalResults` (Chess.com's per-player codes, or a manual game's
 * win/loss/draw) covers resignations, timeouts and agreed draws, and should
 * only be passed at the game's last ply.
 */
export function gameEndBadges(
  fen: string,
  finalResults?: { white: string; black: string },
): GameEndBadgeSpec[] {
  const chess = new Chess(fen)
  if (chess.isCheckmate())
    return decisive(chess.turn() === 'w' ? 'white' : 'black', 'loss', 'checkmate')
  if (chess.isDraw()) return bothDraw('draw')
  if (!finalResults) return []

  const { white, black } = finalResults
  if (white === 'win' || black === 'win') {
    const loser = white === 'win' ? 'black' : 'white'
    const code = (loser === 'white' ? white : black) as GameEndReason
    return decisive(loser, 'flag', LOSS_REASONS.has(code) ? code : 'lost')
  }
  if (DRAW_CODES.has(white)) {
    const code = white as GameEndReason
    return bothDraw(DRAW_REASONS.has(code) ? code : 'draw')
  }
  return []
}

function decisive(
  loser: 'white' | 'black',
  variant: 'loss' | 'flag',
  reason: GameEndReason,
): GameEndBadgeSpec[] {
  return [
    { color: loser, variant, reason },
    { color: loser === 'white' ? 'black' : 'white', variant: 'win', reason: 'winner' },
  ]
}

function bothDraw(reason: GameEndReason): GameEndBadgeSpec[] {
  return (['white', 'black'] as const).map((color) => ({ color, variant: 'draw', reason }))
}
