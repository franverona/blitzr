import { describe, expect, it } from 'vitest'
import { forcedMateWithin, isForcedMate, searchForcedMate } from '@/lib/forcedMate'

// White mates with Ra8#: back-rank mate in 1.
const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'
// Bare kings: nobody can mate.
const NO_MATE = '6k1/8/8/8/8/8/8/6K1 w - - 0 1'

describe('searchForcedMate', () => {
  it('finds a mate in one', () => {
    expect(searchForcedMate(MATE_IN_ONE, 1)).toBe(true)
  })

  it('proves there is no mate when the search finishes', () => {
    expect(searchForcedMate(NO_MATE, 2)).toBe(false)
  })
})

describe('forcedMateWithin', () => {
  // isForcedMate() wants the exact length, so a quicker mate doesn't count there.
  it('counts a quicker mate than the limit', () => {
    expect(isForcedMate(MATE_IN_ONE, 2)).toBe(false)
    expect(forcedMateWithin(MATE_IN_ONE, 2)).toBe(true)
  })

  it('is false when no mate exists', () => {
    expect(forcedMateWithin(NO_MATE, 2)).toBe(false)
  })
})
