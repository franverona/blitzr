import { Chess } from 'chess.js'
import type { PieceSymbol } from 'chess.js'
import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'

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

// chess.js's Move.piece/.captured/.promotion are lowercase 'pnbrqk' regardless
// of color — a separate map from SanPiece above, which is uppercase/no-pawn
// and exists for icon rendering (color+shape), not plain-English names.
const PIECE_NAMES_BY_LOCALE: Record<Locale, Record<PieceSymbol, string>> = {
  en: { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' },
  es: { p: 'Peón', n: 'Caballo', b: 'Alfil', r: 'Torre', q: 'Dama', k: 'Rey' },
}

/** The capitalized display name for a chess.js piece letter, e.g. `n` ->
 *  "Knight" (or "Caballo" in Spanish). Every other file that needs a piece
 *  name goes through this rather than its own copy of the map, so a locale
 *  only needs translating once. */
export function pieceName(piece: PieceSymbol, locale: Locale = getLocale()): string {
  return PIECE_NAMES_BY_LOCALE[locale][piece]
}

// Spanish grammatical gender for each piece noun — everything else is
// masculine ("el"), only torre/dama are feminine ("la").
const FEMININE_PIECES_ES: ReadonlySet<PieceSymbol> = new Set(['r', 'q'])

/** Lowercased piece name with its definite article, e.g. `n` -> "the knight"
 *  / "el caballo", `r` -> "the rook" / "la torre". The "the {piece} on
 *  {square}" phrase this builds shows up in nearly every tactical-
 *  description function (hanging piece, fork, pin, better-move explanation),
 *  so it's centralized here instead of each of those hand-rolling the
 *  Spanish article/gender themselves. */
export function pieceWithArticle(piece: PieceSymbol, locale: Locale = getLocale()): string {
  const name = pieceName(piece, locale).toLowerCase()
  if (locale === 'es') return `${FEMININE_PIECES_ES.has(piece) ? 'la' : 'el'} ${name}`
  return `the ${name}`
}

/**
 * Turns a SAN move into a plain-language sentence, e.g. "Nxe5" -> "Knight
 * captures Pawn on e5" (English) / "Caballo captura Peón en e5" (Spanish).
 * Needs the position *before* the move (to know what, if anything, was
 * captured) — `fenBefore` is replayed with chess.js to reconstruct the
 * move's full detail rather than parsing SAN by hand. Spanish needs real
 * sentence templates here, not a word-for-word swap of the English ones —
 * verb ("captures"/"captura"), preposition ("on"/"en"), and the castling/
 * promotion/check phrasing all differ.
 */
export function describeMove(fenBefore: string, san: string, locale: Locale = getLocale()): string {
  const move = new Chess(fenBefore).move(san)
  const es = locale === 'es'

  if (move.isKingsideCastle()) return es ? 'Enroque corto' : 'Castles kingside'
  if (move.isQueensideCastle()) return es ? 'Enroque largo' : 'Castles queenside'

  const piece = pieceName(move.piece, locale)
  // isEnPassant() is a distinct flag from isCapture() in chess.js — an en
  // passant capture doesn't set the regular capture flag, so it has to be
  // checked separately to still read as a capture here.
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

/**
 * A low-detail hint of what kind of move a SAN move is, e.g. "knight",
 * "pawn", "castling" — enough to nudge without revealing the square. Reuses
 * `pieceName()` (lowercased) rather than a second piece-name map.
 */
export function hintPieceName(san: string, locale: Locale = getLocale()): string {
  if (san.startsWith('O-O')) return locale === 'es' ? 'enroque' : 'castling'
  const { piece } = splitSanPiece(san)
  if (!piece) return locale === 'es' ? 'peón' : 'pawn'
  return pieceName(piece.toLowerCase() as PieceSymbol, locale).toLowerCase()
}
