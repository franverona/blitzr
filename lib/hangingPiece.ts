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

export interface HangingPiece {
  piece: PieceSymbol
  /** The cheapest attacker, when a defender doesn't help because it's worth less. */
  attacker?: { piece: PieceSymbol; square: Square }
}

/**
 * Every `color` piece (excluding the king) that's attacked and either
 * undefended or attacked by a cheaper piece, so a defender doesn't save it.
 * No exchange evaluation or pin awareness.
 */
export function hangingSquares(fen: string, color: Color): Map<Square, HangingPiece> {
  const chess = new Chess(fen)
  const opponent: Color = color === 'w' ? 'b' : 'w'
  const found = new Map<Square, HangingPiece>()

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color || cell.type === 'k') continue
      const attackers = chess.attackers(cell.square, opponent)
      if (attackers.length === 0) continue
      if (!chess.isAttacked(cell.square, color)) {
        found.set(cell.square, { piece: cell.type })
        continue
      }
      const value = (piece: PieceSymbol) => PIECE_VALUES[piece] ?? Infinity
      const cheapest = attackers
        .map((square) => ({ square, piece: chess.get(square)!.type }))
        .sort((a, b) => value(a.piece) - value(b.piece))[0]
      if (value(cheapest.piece) < value(cell.type)) {
        found.set(cell.square, { piece: cell.type, attacker: cheapest })
      }
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

  let worst: ({ square: Square } & HangingPiece) | null = null
  for (const [square, hanging] of after) {
    // Already as exposed before; going from "attacked by a cheaper piece" to undefended is new.
    const was = before.get(square)
    if (was?.piece === hanging.piece && (!was.attacker || hanging.attacker)) continue
    if (!worst || (PIECE_VALUES[hanging.piece] ?? 0) > (PIECE_VALUES[worst.piece] ?? 0)) {
      worst = { square, ...hanging }
    }
  }

  return worst ? hangingReason(worst.square, worst) : null
}

export function hangingReason(square: Square, hanging: HangingPiece): HangingPieceReason {
  return {
    kind: 'hanging-piece',
    piece: hanging.piece,
    square,
    ...(hanging.attacker && { attacker: hanging.attacker }),
  }
}

export function describeHangingPieceReason(
  reason: HangingPieceReason,
  locale: Locale = getLocale(),
): string {
  const piece = pieceWithArticle(reason.piece as PieceSymbol, locale)
  if (reason.attacker) {
    const attacker = pieceWithArticle(reason.attacker.piece as PieceSymbol, locale)
    return locale === 'es'
      ? `Esto deja ${piece} en ${reason.square} atacada por ${attacker} en ${reason.attacker.square}, que vale menos — se pierde material aunque esté defendida.`
      : `This leaves ${piece} on ${reason.square} attacked by ${attacker} on ${reason.attacker.square}, which is worth less — it loses material even though it's defended.`
  }
  return locale === 'es'
    ? `Esto deja ${piece} en ${reason.square} colgando — se puede capturar gratis.`
    : `This leaves ${piece} on ${reason.square} hanging — it can be captured for free.`
}
