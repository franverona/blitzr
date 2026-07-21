import { describe, expect, it } from 'vitest'
import { parseBestMove } from '@/lib/stockfish/client'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('parseBestMove', () => {
  it('parses an ordinary move into from/to squares and SAN', () => {
    expect(parseBestMove(START_FEN, 'e2e4')).toEqual({ from: 'e2', to: 'e4', san: 'e4' })
  })

  it('includes the promoted piece in the SAN', () => {
    // Black pawn one step from promoting, white king nearby — b1=Q is legal
    // and check.
    const fen = '7k/8/8/8/8/8/1p6/7K b - - 0 1'
    expect(parseBestMove(fen, 'b2b1q')).toEqual({ from: 'b2', to: 'b1', san: 'b1=Q+' })
  })

  it('converts castling', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'
    expect(parseBestMove(fen, 'e1g1')).toEqual({ from: 'e1', to: 'g1', san: 'O-O' })
  })

  it('returns null for "(none)" — no legal moves', () => {
    expect(parseBestMove(START_FEN, '(none)')).toBeNull()
  })

  it('returns null for a move that is illegal in the given position', () => {
    expect(parseBestMove(START_FEN, 'e2e5')).toBeNull()
  })
})
