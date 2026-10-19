import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPlayerAvatar } from '@/lib/chesscom/client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPlayerAvatar', () => {
  it('caches per username, case-insensitively', async () => {
    const fetchMock = vi.fn(async () => Response.json({ avatar: 'https://img/a.png' }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await fetchPlayerAvatar('CacheUser')).toBe('https://img/a.png')
    expect(await fetchPlayerAvatar('cacheuser')).toBe('https://img/a.png')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('evicts the oldest entry past 1000 usernames', async () => {
    const fetchMock = vi.fn(async () => Response.json({ avatar: 'https://img/a.png' }))
    vi.stubGlobal('fetch', fetchMock)

    for (let i = 0; i <= 1000; i++) await fetchPlayerAvatar(`evict-${i}`)
    fetchMock.mockClear()

    await fetchPlayerAvatar('evict-1000')
    expect(fetchMock).not.toHaveBeenCalled()
    await fetchPlayerAvatar('evict-0')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null on 429 without retrying', async () => {
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 429, headers: { 'retry-after': '30' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    expect(await fetchPlayerAvatar('rate-limited-user')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null when the request throws (e.g. timeout)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('timed out', 'TimeoutError')
      }),
    )

    expect(await fetchPlayerAvatar('slow-user')).toBeNull()
  })
})
