import { describe, expect, it } from 'vitest'
import { oldestOpenArchiveYm, pendingArchiveYms } from '@/lib/sync'

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

describe('pendingArchiveYms', () => {
  const url = (ym: string) => `https://api.chess.com/pub/player/me/games/${ym.replace('-', '/')}`

  it('skips complete months but always re-fetches open ones', () => {
    const status = new Map([
      ['2026-07', 'complete'],
      ['2026-08', 'partial'],
      ['2026-09', 'complete'],
    ])
    const urls = ['2026-06', '2026-07', '2026-08', '2026-09'].map(url)
    expect(pendingArchiveYms(urls, status, '2026-09')).toEqual(['2026-06', '2026-08', '2026-09'])
  })

  it('ignores URLs without a year/month suffix', () => {
    expect(pendingArchiveYms(['https://example.com/nope'], new Map(), '2026-09')).toEqual([])
  })
})
