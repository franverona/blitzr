import { describe, expect, it } from 'vitest'
import { endOfDaySeconds, formatDate, formatDateTime, startOfDaySeconds } from '@/lib/dates'

describe('formatDate', () => {
  it('formats as DD/MM/YYYY with zero-padding', () => {
    // 2026-01-05T00:00:00 local time
    const unixSeconds = new Date(2026, 0, 5).getTime() / 1000
    expect(formatDate(unixSeconds)).toBe('05/01/2026')
  })
})

describe('formatDateTime', () => {
  it('appends a zero-padded 24h HH:MM after the date', () => {
    const unixSeconds = new Date(2026, 6, 21, 8, 5).getTime() / 1000
    expect(formatDateTime(unixSeconds)).toBe('21/07/2026, 08:05')
  })
})

describe('startOfDaySeconds / endOfDaySeconds', () => {
  it('bracket local midnight-to-midnight for the given calendar day', () => {
    const from = startOfDaySeconds('2026-03-15')
    const to = endOfDaySeconds('2026-03-15')
    expect(new Date(from * 1000)).toEqual(new Date(2026, 2, 15, 0, 0, 0))
    expect(to).toBeGreaterThan(from)
    // A timestamp anywhere within the day falls inside the range...
    expect(new Date(2026, 2, 15, 23, 0).getTime() / 1000).toBeLessThanOrEqual(to)
    // ...and the next day's midnight falls just outside it.
    expect(new Date(2026, 2, 16, 0, 0, 0).getTime() / 1000).toBeGreaterThan(to)
  })
})
