import { Chess } from 'chess.js'

export type MoveSound = 'game-end' | 'move-check' | 'promote' | 'castle' | 'capture' | 'move-self'

function placement(fen: string): string {
  return fen.split(' ')[0]
}

function pieceCount(fen: string): number {
  return placement(fen).replace(/[^a-z]/gi, '').length
}

/** Which chess.com sound (by its CDN file name) the change from `prevFen` to `fen`
 *  should play. Finds the single legal move that turns one into the other to
 *  read its flags; a multi-ply jump (no such move) falls back to capture vs.
 *  plain move by piece count. Precedence matches chess.com: game end, then
 *  check, then promotion/castle/capture, then a plain move. */
export function moveSoundFor(prevFen: string, fen: string): MoveSound {
  let after: Chess
  try {
    after = new Chess(fen)
  } catch {
    return 'move-self'
  }
  if (after.isGameOver()) return 'game-end'
  if (after.inCheck()) return 'move-check'

  let move
  try {
    const before = new Chess(prevFen)
    // ponytail: replays every legal move (~30) to find the one played — fine
    // per position change; pass the move itself in if a caller ever has it.
    move = before.moves({ verbose: true }).find((m) => placement(m.after) === placement(fen))
  } catch {
    // unparseable prevFen — fall through to the piece-count fallback
  }
  if (move?.isPromotion()) return 'promote'
  if (move?.isKingsideCastle() || move?.isQueensideCastle()) return 'castle'
  if (move ? move.isCapture() || move.isEnPassant() : pieceCount(fen) < pieceCount(prevFen)) {
    return 'capture'
  }
  return 'move-self'
}
