import { Chess } from 'chess.js'

/** Walks a game's moves from its starting FEN, returning every resulting
 *  position — index 0 is the starting position, index i+1 is after
 *  movesSan[i]. Shared by board replay and engine analysis, both of which
 *  need the full position list rather than just the final one. */
export function buildPositions(initialFen: string, movesSan: string[]): string[] {
  const chess = new Chess(initialFen)
  const positions = [chess.fen()]
  for (const move of movesSan) {
    chess.move(move)
    positions.push(chess.fen())
  }
  return positions
}
