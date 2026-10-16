import { Chess } from 'chess.js'
import type { Square } from 'chess.js'

export interface LegalDestination {
  to: string
  isCapture: boolean
  /** chess.js reports one move per promotion piece; these are merged. */
  isPromotion: boolean
}

/** Legal destinations for the piece on `square`, captures flagged. */
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
