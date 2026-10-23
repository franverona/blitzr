import { describe, expect, it } from 'vitest'
import { formatMaterialDiff, gamePhase, materialDiff } from '@/lib/material'

describe('materialDiff', () => {
  it('is 0 for the starting position', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(materialDiff(fen)).toBe(0)
  })

  it('favors white after white is up a knight', () => {
    const fen = '4k3/8/8/8/8/8/8/3NK3 w - - 0 1'
    expect(materialDiff(fen)).toBe(3)
  })

  it('favors black after black is up a queen', () => {
    const fen = '3qk3/8/8/8/8/8/8/4K3 w - - 0 1'
    expect(materialDiff(fen)).toBe(-9)
  })

  it('sums multiple pieces on both sides', () => {
    // White: rook (5) + bishop (3) = 8. Black: knight (3) + knight (3) = 6.
    const fen = '4k3/8/8/8/8/n1n5/8/R1BK4 w - - 0 1'
    expect(materialDiff(fen)).toBe(2)
  })
})

describe('formatMaterialDiff', () => {
  it('formats a positive diff with a leading plus', () => {
    expect(formatMaterialDiff(2)).toBe('+2')
  })

  it('formats a negative diff without a double sign', () => {
    expect(formatMaterialDiff(-3)).toBe('-3')
  })

  it('formats zero as Even', () => {
    expect(formatMaterialDiff(0)).toBe('Even')
  })

  it('formats zero as Igual in Spanish', () => {
    expect(formatMaterialDiff(0, 'es')).toBe('Igual')
  })
})

describe('gamePhase', () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  it('calls the first 10 moves the opening, then the middlegame', () => {
    expect(gamePhase(start, 1)).toBe('opening')
    expect(gamePhase(start, 20)).toBe('opening')
    expect(gamePhase(start, 21)).toBe('middlegame')
  })

  it('calls a position with at most 6 queens, rooks and minor pieces an endgame, from any ply', () => {
    // Two rooks and a bishop each: 6 pieces.
    expect(gamePhase('r1b1k2r/pppp1ppp/8/8/8/8/PPPP1PPP/R1B1K2R w KQkq - 0 15', 9)).toBe('endgame')
    // One more knight: 7 pieces, still the middlegame.
    expect(gamePhase('r1b1k2r/pppp1ppp/8/8/8/5N2/PPPP1PPP/R1B1K2R w KQkq - 0 15', 40)).toBe(
      'middlegame',
    )
  })
})
