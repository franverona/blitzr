import { Chess } from 'chess.js'
import type { PieceSymbol } from 'chess.js'
import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'

export const PIECE_VALUES: Partial<Record<PieceSymbol, number>> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
}

/** White's total piece value minus Black's, at the given position — kings
 *  excluded (no material value). Positive favors White, negative favors
 *  Black, 0 is even. */
export function materialDiff(fen: string): number {
  const board = new Chess(fen).board()
  let diff = 0
  for (const row of board) {
    for (const square of row) {
      if (!square) continue
      const value = PIECE_VALUES[square.type] ?? 0
      diff += square.color === 'w' ? value : -value
    }
  }
  return diff
}

/** Formats a material difference for display, e.g. 2 -> "+2", -3 -> "-3", 0 -> "Even". */
export function formatMaterialDiff(diff: number, locale: Locale = getLocale()): string {
  if (diff === 0) return locale === 'es' ? 'Igual' : 'Even'
  return diff > 0 ? `+${diff}` : `${diff}`
}
