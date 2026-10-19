import { describe, expect, it } from 'vitest'
import { BOARD_ANIMATION_DURATION_MS, getPlaySpeed, PLAY_SPEEDS } from '@/lib/theme'

describe('play speed', () => {
  it('parses the cookie, defaulting to normal', () => {
    expect(getPlaySpeed('fast')).toBe('fast')
    expect(getPlaySpeed(undefined)).toBe('normal')
    expect(getPlaySpeed('ludicrous')).toBe('normal')
  })

  it('never steps faster than a move animates', () => {
    expect(Math.min(...Object.values(PLAY_SPEEDS))).toBeGreaterThan(BOARD_ANIMATION_DURATION_MS)
  })
})
