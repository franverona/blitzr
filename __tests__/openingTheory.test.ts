import { describe, expect, it } from 'vitest'
import { getOpeningLesson, OPENING_LESSONS } from '@/lib/openingTheory'

describe('getOpeningLesson', () => {
  it('finds a lesson by slug', () => {
    expect(getOpeningLesson('kings-pawn-opening')).toBe(OPENING_LESSONS[0])
  })

  it('returns undefined for an unknown slug', () => {
    expect(getOpeningLesson('not-a-real-opening')).toBeUndefined()
  })
})
