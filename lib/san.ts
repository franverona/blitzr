import { Chess } from 'chess.js'
import type { PieceSymbol } from 'chess.js'
import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'

export type SanPiece = 'K' | 'Q' | 'R' | 'B' | 'N'

/** "Nc7" -> { piece: 'N', rest: 'c7' }; pawn moves and castling get `piece: null`. */
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

const PIECE_NAMES_BY_LOCALE: Record<Locale, Record<PieceSymbol, string>> = {
  en: { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' },
  es: { p: 'Peón', n: 'Caballo', b: 'Alfil', r: 'Torre', q: 'Dama', k: 'Rey' },
}

export function pieceName(piece: PieceSymbol, locale: Locale = getLocale()): string {
  return PIECE_NAMES_BY_LOCALE[locale][piece]
}

const FEMININE_PIECES_ES: ReadonlySet<PieceSymbol> = new Set(['r', 'q'])

/** e.g. `n` -> "the knight" / "el caballo", `r` -> "the rook" / "la torre". */
export function pieceWithArticle(piece: PieceSymbol, locale: Locale = getLocale()): string {
  const name = pieceName(piece, locale).toLowerCase()
  if (locale === 'es') return `${FEMININE_PIECES_ES.has(piece) ? 'la' : 'el'} ${name}`
  return `the ${name}`
}

/** e.g. "Nxe5" -> "Knight captures Pawn on e5". Needs the position before the move. */
export function describeMove(fenBefore: string, san: string, locale: Locale = getLocale()): string {
  const move = new Chess(fenBefore).move(san)
  const es = locale === 'es'

  if (move.isKingsideCastle()) return es ? 'Enroque corto' : 'Castles kingside'
  if (move.isQueensideCastle()) return es ? 'Enroque largo' : 'Castles queenside'

  const piece = pieceName(move.piece, locale)
  // chess.js doesn't set the capture flag for en passant.
  const captured = move.isCapture() || move.isEnPassant() ? move.captured : undefined

  let description: string
  if (captured) {
    const capturedName = pieceName(captured, locale)
    description = es
      ? `${piece} captura ${capturedName} en ${move.to}`
      : `${piece} captures ${capturedName} on ${move.to}`
  } else {
    description = es ? `${piece} a ${move.to}` : `${piece} to ${move.to}`
  }
  if (move.isPromotion() && move.promotion) {
    const promotedName = pieceName(move.promotion, locale)
    description += es ? ` y corona en ${promotedName}` : ` and promotes to ${promotedName}`
  }

  if (san.endsWith('#')) return `${description}${es ? ', jaque mate' : ', checkmate'}`
  if (san.endsWith('+')) return `${description}${es ? ', jaque' : ', check'}`
  return description
}

export interface FormattedMove {
  moveNumber: number
  color: 'white' | 'black'
  san: string
}

/**
 * Move number and color for each move of a sequence starting at `fen`, which
 * may be any position with either side to move.
 */
export function formatMoveSequence(fen: string, sanMoves: string[]): FormattedMove[] {
  const [, sideToMove, , , , fullmove] = fen.split(' ')
  let moveNumber = Number(fullmove)
  let color: 'white' | 'black' = sideToMove === 'b' ? 'black' : 'white'

  return sanMoves.map((san) => {
    const entry: FormattedMove = { moveNumber, color, san }
    if (color === 'black') moveNumber++
    color = color === 'white' ? 'black' : 'white'
    return entry
  })
}

/** A vague hint at the move, e.g. "knight" or "castling", without the square. */
export function hintPieceName(san: string, locale: Locale = getLocale()): string {
  if (san.startsWith('O-O')) return locale === 'es' ? 'enroque' : 'castling'
  const { piece } = splitSanPiece(san)
  if (!piece) return locale === 'es' ? 'peón' : 'pawn'
  return pieceName(piece.toLowerCase() as PieceSymbol, locale).toLowerCase()
}
