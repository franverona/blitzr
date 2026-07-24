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

/** Every `color` piece (excl. king) on `fen` that's attacked by the opponent
 *  and has no defender of its own color — capturable for free. No static
 *  exchange evaluation (an attacker outvalued by the piece it'd capture
 *  still counts) and no pin awareness (a pinned "attacker" still counts) —
 *  both out of scope for this v1 heuristic. */
function hangingSquares(fen: string, color: Color): Map<Square, PieceSymbol> {
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
 * The single most valuable of the mover's own pieces that became hanging as
 * a result of this move — either the piece that just moved onto an
 * undefended, attacked square, or a different piece it stopped defending
 * (a discovered hang). Comparing before/after (rather than just scanning
 * `fenAfter`) is what catches both cases while filtering out anything that
 * was already hanging before this move — a pre-existing weakness elsewhere
 * in the position, not something this move caused.
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
