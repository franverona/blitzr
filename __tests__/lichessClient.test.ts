import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLichessGames } from '@/lib/lichess/client'

afterEach(() => vi.unstubAllGlobals())

describe('fetchLichessGames', () => {
  it('pages oldest first from the last game until a short page', async () => {
    const urls: URL[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = new URL(url)
        urls.push(u)
        const from = Number(u.searchParams.get('since'))
        // 1000 games from `from` on the first page, 2 on the second.
        const count = urls.length === 1 ? 1000 : 2
        const lines = Array.from({ length: count }, (_, i) =>
          JSON.stringify({ id: `g${from + i}`, createdAt: from + i }),
        )
        return new Response(lines.join('\n') + '\n')
      }),
    )
    const games = await fetchLichessGames('me', 0, 5000)
    expect(games).toHaveLength(1002)
    expect(urls.map((u) => u.searchParams.get('since'))).toEqual(['0', '1000'])
    expect(urls[0].searchParams.get('sort')).toBe('dateAsc')
    expect(urls[0].searchParams.get('until')).toBe('5000')
  })
})
