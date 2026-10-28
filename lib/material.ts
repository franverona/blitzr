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

/** White's piece value minus Black's (kings excluded). */
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

export type GamePhase = 'opening' | 'middlegame' | 'endgame'

// An endgame has at most 6 queens, rooks and minor pieces left between both sides (Lichess's
// game divider uses the same count); before that, the first 10 moves are the opening.
const ENDGAME_MAX_PIECES = 6
const OPENING_MOVES = 10

/** The phase of the position `fen`. Its fullmove number, not the ply, so a game from a FEN counts from there. */
export function gamePhase(fen: string): GamePhase {
  const [placement, , , , , fullmove] = fen.split(' ')
  const pieces = placement.replace(/[^qrbnQRBN]/g, '').length
  if (pieces <= ENDGAME_MAX_PIECES) return 'endgame'
  return (Number(fullmove) || 1) <= OPENING_MOVES ? 'opening' : 'middlegame'
}

export function formatMaterialDiff(diff: number, locale: Locale = getLocale()): string {
  if (diff === 0) return locale === 'es' ? 'Igual' : 'Even'
  return diff > 0 ? `+${diff}` : `${diff}`
}
