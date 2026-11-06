import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchArchiveMonth, fetchArchives } from '@/lib/chesscom/client'
import { fetchLichessCreatedAt, fetchLichessGames } from '@/lib/lichess/client'
import {
  autoSyncMinutes,
  isArchiveKey,
  isSyncStale,
  lichessArchiveYms,
  listPendingArchives,
  oldestOpenArchiveYm,
  pendingArchiveYms,
  syncArchive,
} from '@/lib/sync'

const repo = vi.hoisted(() => ({
  upsertGames: vi.fn(async (games: unknown[]) => games.length - 1),
  markArchiveSynced: vi.fn(async () => {}),
  getArchiveSyncStatus: vi.fn(async () => [{ archiveYm: '2026-07', status: 'complete' }]),
  listManualGames: vi.fn(async (): Promise<unknown[]> => []),
}))
vi.mock('@/lib/db', () => ({ getRepository: () => repo }))
const usernames = vi.hoisted(() => ({
  chesscom: 'me' as string | undefined,
  lichess: undefined as string | undefined,
}))
vi.mock('@/lib/config', () => ({
  siteUsername: (site: 'chesscom' | 'lichess') => usernames[site],
}))
vi.mock('@/lib/lichess/client', () => ({
  fetchLichessCreatedAt: vi.fn(),
  fetchLichessGames: vi.fn(),
}))
vi.mock('@/lib/lichess/normalize', () => ({
  isOngoing: (raw: { status: string }) => raw.status === 'started',
  normalizeLichessGame: (
    raw: { id: string; status: string },
    _username: string,
    archiveYm: string,
  ) =>
    raw.status === 'started'
      ? null
      : {
          id: `lichess:${raw.id}`,
          archiveYm,
          url: `https://lichess.org/${raw.id}`,
          whiteUsername: 'me',
          blackUsername: 'them',
          movesSan: [raw.id],
        },
}))
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

  it('takes the interval from BLITZR_AUTO_SYNC_MINUTES', () => {
    vi.stubEnv('BLITZR_AUTO_SYNC_MINUTES', '15')
    try {
      expect(isSyncStale(['2026-09-15T11:30:00Z'], now)).toBe(true)
      expect(isSyncStale(['2026-09-15T11:50:00Z'], now)).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('autoSyncMinutes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to an hour, and falls back to it for invalid values', () => {
    expect(autoSyncMinutes()).toBe(60)
    for (const value of ['abc', '-5', '']) {
      vi.stubEnv('BLITZR_AUTO_SYNC_MINUTES', value)
      expect(autoSyncMinutes()).toBe(60)
    }
  })

  it('reads 0 as off, which still leaves Today a stale cutoff', () => {
    vi.stubEnv('BLITZR_AUTO_SYNC_MINUTES', '0')
    expect(autoSyncMinutes()).toBe(0)
    expect(isSyncStale(['2026-09-15T11:30:00Z'], new Date('2026-09-15T12:00:00Z'))).toBe(false)
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
    repo.listManualGames.mockResolvedValueOnce([
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

describe('lichessArchiveYms', () => {
  it('lists every month from the account creation to now, in UTC', () => {
    const createdAt = Date.UTC(2025, 10, 30, 23)
    expect(lichessArchiveYms(createdAt, new Date('2026-02-01T00:30:00Z'))).toEqual([
      'lichess:2025-11',
      'lichess:2025-12',
      'lichess:2026-01',
      'lichess:2026-02',
    ])
  })

  it('lists nothing for a creation date that is not a number', () => {
    expect(lichessArchiveYms(NaN)).toEqual([])
  })
})

describe('isArchiveKey', () => {
  it("accepts both sites' keys and nothing else", () => {
    expect(isArchiveKey('2026-08')).toBe(true)
    expect(isArchiveKey('lichess:2026-08')).toBe(true)
    expect(isArchiveKey('lichess:2026-8')).toBe(false)
    expect(isArchiveKey('chesscom:2026-08')).toBe(false)
  })
})

describe('syncArchive for Lichess', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-09-15T12:00:00Z') })
    vi.clearAllMocks()
    usernames.lichess = 'lich'
  })
  afterEach(() => {
    vi.useRealTimers()
    usernames.lichess = undefined
  })

  it("fetches the month's UTC bounds and marks a closed month complete", async () => {
    vi.mocked(fetchLichessGames).mockResolvedValue([{ id: 'x', status: 'mate' }] as never)
    await syncArchive('lichess:2026-08')
    expect(fetchLichessGames).toHaveBeenCalledWith(
      'lich',
      Date.UTC(2026, 7, 1),
      Date.UTC(2026, 8, 1) - 1,
    )
    expect(repo.upsertGames).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'lichess:x', archiveYm: 'lichess:2026-08' }),
    ])
    expect(repo.markArchiveSynced).toHaveBeenCalledWith('lichess:2026-08', 'complete', 1)
  })

  it('keeps a closed month open while one of its games is still being played', async () => {
    vi.mocked(fetchLichessGames).mockResolvedValue([
      { id: 'x', status: 'mate' },
      { id: 'y', status: 'started' },
    ] as never)
    await syncArchive('lichess:2026-08')
    expect(repo.upsertGames).toHaveBeenCalledWith([expect.objectContaining({ id: 'lichess:x' })])
    expect(repo.markArchiveSynced).toHaveBeenCalledWith('lichess:2026-08', 'partial', 2)
  })
})

describe('listPendingArchives', () => {
  it('lists Chess.com months, then Lichess ones, for the usernames set', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T12:00:00Z') })
    usernames.lichess = 'lich'
    vi.mocked(fetchArchives).mockResolvedValue([
      'https://api.chess.com/pub/player/me/games/2026/09',
    ])
    vi.mocked(fetchLichessCreatedAt).mockResolvedValue(Date.UTC(2026, 7, 10))
    repo.getArchiveSyncStatus.mockResolvedValueOnce([
      { archiveYm: 'lichess:2026-08', status: 'complete' },
    ])
    expect(await listPendingArchives()).toEqual({ archives: ['2026-09', 'lichess:2026-09'] })

    usernames.chesscom = undefined
    vi.mocked(fetchArchives).mockClear()
    expect(await listPendingArchives()).toEqual({
      archives: ['lichess:2026-08', 'lichess:2026-09'],
    })
    expect(fetchArchives).not.toHaveBeenCalled()
    usernames.chesscom = 'me'
    usernames.lichess = undefined
    vi.useRealTimers()
  })

  it("skips the user's complete months", async () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T12:00:00Z') })
    vi.mocked(fetchArchives).mockResolvedValue(
      ['2026-07', '2026-08'].map(
        (ym) => `https://api.chess.com/pub/player/me/games/${ym.replace('-', '/')}`,
      ),
    )
    expect(await listPendingArchives()).toEqual({ archives: ['2026-08'] })
    expect(fetchArchives).toHaveBeenCalledWith('me')
    vi.useRealTimers()
  })

  it("lists one site's months when the other fails, and throws only when both do", async () => {
    vi.useFakeTimers({ now: new Date('2026-09-15T12:00:00Z') })
    usernames.lichess = 'lich'
    const down = new Error('lichess down')
    vi.mocked(fetchArchives).mockResolvedValue([
      'https://api.chess.com/pub/player/me/games/2026/09',
    ])
    vi.mocked(fetchLichessCreatedAt).mockRejectedValue(down)
    expect(await listPendingArchives()).toEqual({ archives: ['2026-09'], error: down })

    vi.mocked(fetchArchives).mockRejectedValue(new Error('chess.com down'))
    await expect(listPendingArchives()).rejects.toThrow('chess.com down')
    usernames.lichess = undefined
    vi.useRealTimers()
  })
})
