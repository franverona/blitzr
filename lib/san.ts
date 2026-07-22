import { Chess } from 'chess.js'
import type { PieceSymbol } from 'chess.js'

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
const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
}

/**
 * Turns a SAN move into a plain-English sentence, e.g. "Nxe5" -> "Knight
 * captures pawn on e5". Needs the position *before* the move (to know what,
 * if anything, was captured) — `fenBefore` is replayed with chess.js to
 * reconstruct the move's full detail rather than parsing SAN by hand.
 */
export function describeMove(fenBefore: string, san: string): string {
  const move = new Chess(fenBefore).move(san)

  if (move.isKingsideCastle()) return 'Castles kingside'
  if (move.isQueensideCastle()) return 'Castles queenside'

  const piece = PIECE_NAMES[move.piece]
  // isEnPassant() is a distinct flag from isCapture() in chess.js — an en
  // passant capture doesn't set the regular capture flag, so it has to be
  // checked separately to still read as a capture here.
  const captured = move.isCapture() || move.isEnPassant() ? move.captured : undefined

  let description: string
  if (captured) {
    description = `${piece} captures ${PIECE_NAMES[captured]} on ${move.to}`
  } else {
    description = `${piece} to ${move.to}`
  }
  if (move.isPromotion() && move.promotion) {
    description += ` and promotes to ${PIECE_NAMES[move.promotion]}`
  }

  if (san.endsWith('#')) return `${description}, checkmate`
  if (san.endsWith('+')) return `${description}, check`
  return description
}
