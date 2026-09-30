import { describe, expect, it } from 'vitest'
import { START_FEN, isStandardChess, startsFromStandardPosition } from '@/lib/positions'

describe('isStandardChess / startsFromStandardPosition', () => {
  const customFen = '4k3/8/8/8/8/8/8/4K3 b - - 0 1'

  it('accepts standard chess from the normal start for both', () => {
    const game = { rules: 'chess', initialFen: START_FEN }
    expect(isStandardChess(game)).toBe(true)
    expect(startsFromStandardPosition(game)).toBe(true)
  })

  it('keeps a custom-position start analyzable but out of opening matching', () => {
    const game = { rules: 'chess', initialFen: customFen }
    expect(isStandardChess(game)).toBe(true)
    expect(startsFromStandardPosition(game)).toBe(false)
  })

  it('rejects variants for both', () => {
    for (const rules of ['chess960', 'threecheck', 'crazyhouse', 'kingofthehill']) {
      const game = { rules, initialFen: START_FEN }
      expect(isStandardChess(game)).toBe(false)
      expect(startsFromStandardPosition(game)).toBe(false)
    }
  })
})
