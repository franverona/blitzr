import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '@/lib/dates'

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
