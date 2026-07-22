import { Chess } from 'chess.js'
import type { Square } from 'chess.js'

export interface LegalDestination {
  to: string
  isCapture: boolean
}

/** Legal destination squares for the piece on `square`, with captures
 *  flagged separately — drives the dot-vs-ring distinction in the board's
 *  legal-move highlighting. Empty array for an empty square or one with no
 *  legal moves. Takes a plain string (what react-chessboard's click/drag
 *  handlers hand back) rather than leaking chess.js's `Square` union into
 *  every caller — it's always a real algebraic square in practice. */
export function legalDestinations(fen: string, square: string): LegalDestination[] {
  const chess = new Chess(fen)
  return chess.moves({ square: square as Square, verbose: true }).map((move) => ({
    to: move.to,
    isCapture: move.isCapture(),
  }))
}
