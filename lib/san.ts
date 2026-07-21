export type SanPiece = 'K' | 'Q' | 'R' | 'B' | 'N'

/**
 * Splits a leading piece letter off a SAN move string, e.g. "Nc7" -> { piece:
 * 'N', rest: 'c7' }, "Bxh6+" -> { piece: 'B', rest: 'xh6+' }. Pawn moves
 * ("e4", "exd5") and castling ("O-O") have no leading piece letter and get
 * `piece: null` back unchanged.
 */
export function splitSanPiece(san: string): { piece: SanPiece | null; rest: string } {
  const match = san.match(/^([KQRBN])(.+)$/)
  if (!match) return { piece: null, rest: san }
  return { piece: match[1] as SanPiece, rest: match[2] }
}

/** Formats a 1-indexed ply as a move-number label, e.g. 1 -> "1.", 2 -> "1…". */
export function plyLabel(ply: number): string {
  const moveNumber = Math.ceil(ply / 2)
  return ply % 2 === 1 ? `${moveNumber}.` : `${moveNumber}…`
}
