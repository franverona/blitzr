import { describe, expect, it } from 'vitest'
import { formatMaterialDiff, materialDiff } from '@/lib/material'

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
})
