import { Chess } from 'chess.js'
import type { Square } from 'chess.js'

export interface LegalDestination {
  to: string
  isCapture: boolean
  /** True when landing on `to` requires choosing a promotion piece — chess.js
   *  reports one move per possible promotion piece for the same to-square,
   *  so this is just whether *any* of them has a `promotion` field, not a
   *  specific piece choice. */
  isPromotion: boolean
}

/** Legal destination squares for the piece on `square`, with captures
 *  flagged separately — drives the dot-vs-ring distinction in the board's
 *  legal-move highlighting. Empty array for an empty square or one with no
 *  legal moves. Takes a plain string (what react-chessboard's click/drag
 *  handlers hand back) rather than leaking chess.js's `Square` union into
 *  every caller — it's always a real algebraic square in practice. */
export function legalDestinations(fen: string, square: string): LegalDestination[] {
  const chess = new Chess(fen)
  const seen = new Map<string, LegalDestination>()
  for (const move of chess.moves({ square: square as Square, verbose: true })) {
    seen.set(move.to, {
      to: move.to,
      isCapture: move.isCapture(),
      isPromotion: seen.get(move.to)?.isPromotion || move.promotion !== undefined,
    })
  }
  return [...seen.values()]
}
