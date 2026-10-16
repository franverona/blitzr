import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'
import { PIECE_VALUES } from './material'
import { pieceWithArticle } from './san'
import type { HangingPieceReason, MyColor } from './types'

function toColor(color: MyColor): Color {
  return color === 'white' ? 'w' : 'b'
}

/** Every `color` piece (excluding the king) attacked and undefended. No
 *  exchange evaluation or pin awareness. */
export function hangingSquares(fen: string, color: Color): Map<Square, PieceSymbol> {
  const chess = new Chess(fen)
  const opponent: Color = color === 'w' ? 'b' : 'w'
  const found = new Map<Square, PieceSymbol>()

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color || cell.type === 'k') continue
      if (!chess.isAttacked(cell.square, opponent)) continue
      if (chess.isAttacked(cell.square, color)) continue
      found.set(cell.square, cell.type)
    }
  }
  return found
}

/**
 * The most valuable of the mover's pieces newly hanging after the move —
 * the moved piece itself, or one it stopped defending. Pieces already
 * hanging before the move don't count.
 */
export function detectHangingPiece(
  fenBefore: string,
  fenAfter: string,
  moverColor: MyColor,
): HangingPieceReason | null {
  const color = toColor(moverColor)
  const before = hangingSquares(fenBefore, color)
  const after = hangingSquares(fenAfter, color)

  let worst: { square: Square; piece: PieceSymbol } | null = null
  for (const [square, piece] of after) {
    if (before.get(square) === piece) continue
    if (!worst || (PIECE_VALUES[piece] ?? 0) > (PIECE_VALUES[worst.piece] ?? 0)) {
      worst = { square, piece }
    }
  }

  return worst ? { kind: 'hanging-piece', piece: worst.piece, square: worst.square } : null
}

export function describeHangingPieceReason(
  reason: HangingPieceReason,
  locale: Locale = getLocale(),
): string {
  const piece = pieceWithArticle(reason.piece as PieceSymbol, locale)
  return locale === 'es'
    ? `Esto deja ${piece} en ${reason.square} colgando — se puede capturar gratis.`
    : `This leaves ${piece} on ${reason.square} hanging — it can be captured for free.`
}
