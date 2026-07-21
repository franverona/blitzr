import { describe, expect, it } from 'vitest'
import { splitSanPiece } from '@/lib/san'

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
