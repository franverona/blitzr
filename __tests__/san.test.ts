import { describe, expect, it } from 'vitest'
import { describeMove, hintPieceName, plyLabel, splitSanPiece } from '@/lib/san'

describe('splitSanPiece', () => {
  it('splits a leading piece letter off piece moves', () => {
    expect(splitSanPiece('Nc7')).toEqual({ piece: 'N', rest: 'c7' })
    expect(splitSanPiece('Bxh6+')).toEqual({ piece: 'B', rest: 'xh6+' })
    expect(splitSanPiece('Rae1')).toEqual({ piece: 'R', rest: 'ae1' })
    expect(splitSanPiece('Qxe6#')).toEqual({ piece: 'Q', rest: 'xe6#' })
    expect(splitSanPiece('Kg8')).toEqual({ piece: 'K', rest: 'g8' })
  })

  it('leaves pawn moves and castling unchanged with no piece', () => {
    expect(splitSanPiece('e4')).toEqual({ piece: null, rest: 'e4' })
    expect(splitSanPiece('exd5')).toEqual({ piece: null, rest: 'exd5' })
    expect(splitSanPiece('a6')).toEqual({ piece: null, rest: 'a6' })
    expect(splitSanPiece('O-O')).toEqual({ piece: null, rest: 'O-O' })
    expect(splitSanPiece('O-O-O')).toEqual({ piece: null, rest: 'O-O-O' })
  })
})

describe('plyLabel', () => {
  it('labels white plies with a period', () => {
    expect(plyLabel(1)).toBe('1.')
    expect(plyLabel(3)).toBe('2.')
  })

  it('labels black plies with an ellipsis', () => {
    expect(plyLabel(2)).toBe('1…')
    expect(plyLabel(4)).toBe('2…')
  })
})

describe('describeMove', () => {
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  it('describes a quiet move', () => {
    expect(describeMove(START_FEN, 'e4')).toBe('Pawn to e4')
  })

  it('describes a capture', () => {
    const fen = '4k3/8/8/4p3/8/3N4/8/4K3 w - - 0 1'
    expect(describeMove(fen, 'Nxe5')).toBe('Knight captures Pawn on e5')
  })

  it('describes an en passant capture as a capture', () => {
    const fen = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'
    expect(describeMove(fen, 'exd6')).toBe('Pawn captures Pawn on d6')
  })

  it('describes kingside and queenside castling', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'
    expect(describeMove(fen, 'O-O')).toBe('Castles kingside')
    expect(describeMove(fen, 'O-O-O')).toBe('Castles queenside')
  })

  it('describes a promotion without a capture', () => {
    const fen = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1'
    expect(describeMove(fen, 'e8=Q')).toBe('Pawn to e8 and promotes to Queen')
  })

  it('describes a promotion with a capture', () => {
    const fen = '3n1k2/4P3/8/8/8/8/8/4K3 w - - 0 1'
    expect(describeMove(fen, 'exd8=Q')).toBe('Pawn captures Knight on d8 and promotes to Queen')
  })

  it('appends a check suffix', () => {
    const fen = '4k3/8/8/7Q/8/8/8/4K3 w - - 0 1'
    expect(describeMove(fen, 'Qe5+')).toBe('Queen to e5, check')
  })

  it('appends a checkmate suffix', () => {
    const fen = '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1'
    expect(describeMove(fen, 'Rd8#')).toBe('Rook to d8, checkmate')
  })
})

describe('hintPieceName', () => {
  it('names each piece letter', () => {
    expect(hintPieceName('Nc7')).toBe('knight')
    expect(hintPieceName('Bxh6+')).toBe('bishop')
    expect(hintPieceName('Rae1')).toBe('rook')
    expect(hintPieceName('Qxe6#')).toBe('queen')
    expect(hintPieceName('Kg8')).toBe('king')
  })

  it('names a pawn move with no leading piece letter', () => {
    expect(hintPieceName('e4')).toBe('pawn')
    expect(hintPieceName('exd5')).toBe('pawn')
  })

  it('names both castles "castling", not "king"', () => {
    expect(hintPieceName('O-O')).toBe('castling')
    expect(hintPieceName('O-O-O')).toBe('castling')
  })
})
