import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchArchiveMonth, fetchArchives } from '@/lib/chesscom/client'
import {
  isSyncStale,
  listPendingArchives,
  oldestOpenArchiveYm,
  pendingArchiveYms,
  syncArchive,
} from '@/lib/sync'

const repo = vi.hoisted(() => ({
  upsertGames: vi.fn(async (games: unknown[]) => games.length - 1),
  markArchiveSynced: vi.fn(async () => {}),
  getArchiveSyncStatus: vi.fn(async () => [{ archiveYm: '2026-07', status: 'complete' }]),
  listAllGames: vi.fn(async (): Promise<unknown[]> => []),
}))
vi.mock('@/lib/db', () => ({ getRepository: () => repo }))
vi.mock('@/lib/config', () => ({ getChesscomUsername: () => 'me' }))
vi.mock('@/lib/chesscom/client', () => ({ fetchArchives: vi.fn(), fetchArchiveMonth: vi.fn() }))
vi.mock('@/lib/chesscom/normalize', () => ({
  normalizeGame: (raw: { uuid: string; url?: string }, _username: string, archiveYm: string) => ({
    id: raw.uuid,
    archiveYm,
    url: raw.url ?? '',
    whiteUsername: 'me',
    blackUsername: 'them',
    movesSan: [raw.uuid],
  }),
}))

describe('isSyncStale', () => {
  const now = new Date('2026-09-15T12:00:00Z')

  it('is stale once the newest sync is over an hour old', () => {
    expect(isSyncStale(['2026-09-15T10:00:00Z', '2026-09-15T10:30:00Z'], now)).toBe(true)
    expect(isSyncStale(['2026-09-15T10:00:00Z', '2026-09-15T11:30:00Z'], now)).toBe(false)
  })

  it('never auto-syncs before a first sync', () => {
    expect(isSyncStale([], now)).toBe(false)
  })
})

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

describe('syncArchive', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-09-15T12:00:00Z') })
    vi.clearAllMocks()
    vi.mocked(fetchArchiveMonth).mockResolvedValue([{ uuid: 'a' }, { uuid: 'b' }] as never)
  })
  afterEach(() => vi.useRealTimers())

  it('stores a closed month and marks it complete', async () => {
    expect(await syncArchive('2026-08')).toBe(1)
    expect(fetchArchiveMonth).toHaveBeenCalledWith('me', '2026', '08')
    expect(repo.upsertGames).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'a', archiveYm: '2026-08' }),
      expect.objectContaining({ id: 'b', archiveYm: '2026-08' }),
    ])
    expect(repo.markArchiveSynced).toHaveBeenCalledWith('2026-08', 'complete', 2)
  })

  it('skips a game already pasted in, keeping the pasted copy', async () => {
    vi.mocked(fetchArchiveMonth).mockResolvedValue([
      { uuid: 'a', url: 'https://www.chess.com/game/live/1' },
      { uuid: 'b', url: 'https://www.chess.com/game/live/2' },
    ] as never)
    repo.listAllGames.mockResolvedValueOnce([
      {
        id: 'pasted',
        archiveYm: 'manual',
        url: 'https://www.chess.com/game/live/2?move=0',
        whiteUsername: 'me',
        blackUsername: 'them',
        movesSan: ['other'],
      },
    ])
    await syncArchive('2026-08')
    expect(repo.upsertGames).toHaveBeenCalledWith([expect.objectContaining({ id: 'a' })])
  })

  it('marks a still-open month partial', async () => {
    await syncArchive('2026-09')
    expect(repo.markArchiveSynced).toHaveBeenCalledWith('2026-09', 'partial', 2)
  })

  it('fails without marking the month when the fetch fails', async () => {
    vi.mocked(fetchArchiveMonth).mockRejectedValue(new Error('429'))
    await expect(syncArchive('2026-08')).rejects.toThrow('429')
    expect(repo.markArchiveSynced).not.toHaveBeenCalled()
  })
})

describe('listPendingArchives', () => {
  it("skips the user's complete months", async () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T12:00:00Z') })
    vi.mocked(fetchArchives).mockResolvedValue(
      ['2026-07', '2026-08'].map(
        (ym) => `https://api.chess.com/pub/player/me/games/${ym.replace('-', '/')}`,
      ),
    )
    expect(await listPendingArchives()).toEqual(['2026-08'])
    expect(fetchArchives).toHaveBeenCalledWith('me')
    vi.useRealTimers()
  })
})
