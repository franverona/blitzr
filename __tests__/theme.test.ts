import { describe, expect, it } from 'vitest'
import { getTrainingOrientation, resolveOrientation } from '@/lib/theme'

describe('training orientation', () => {
  it('parses the cookie, defaulting to auto', () => {
    expect(getTrainingOrientation('black')).toBe('black')
    expect(getTrainingOrientation(undefined)).toBe('auto')
    expect(getTrainingOrientation('sideways')).toBe('auto')
  })

  it('uses the side to play only on auto', () => {
    expect(resolveOrientation('auto', 'black')).toBe('black')
    expect(resolveOrientation('white', 'black')).toBe('white')
  })
})
