import { describe, expect, it } from 'vitest'
import { oldestOpenArchiveYm } from '@/lib/sync'

describe('oldestOpenArchiveYm', () => {
  it('is the current UTC month mid-month', () => {
    expect(oldestOpenArchiveYm(new Date('2026-09-15T12:00:00Z'))).toBe('2026-09')
  })

  it('keeps the previous month open for a day after it ends in UTC', () => {
    // 00:30 on Oct 1 in Spain (UTC+2) is still Sep 30 in UTC.
    expect(oldestOpenArchiveYm(new Date('2026-09-30T22:30:00Z'))).toBe('2026-09')
    expect(oldestOpenArchiveYm(new Date('2026-10-01T23:59:00Z'))).toBe('2026-09')
    expect(oldestOpenArchiveYm(new Date('2026-10-02T00:01:00Z'))).toBe('2026-10')
  })

  it('handles the year boundary', () => {
    expect(oldestOpenArchiveYm(new Date('2027-01-01T10:00:00Z'))).toBe('2026-12')
  })
})
