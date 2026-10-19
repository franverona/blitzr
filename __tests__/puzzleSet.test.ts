import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MateProblem } from '@/lib/mateProblems'

const polgar = { id: 222, title: 'Polgár puzzle #1', composer: 'László Polgár' } as MateProblem

// puzzleSet caches the local file per module, so each case loads a fresh copy.
async function loadWithLocalFile(read: () => string) {
  vi.resetModules()
  vi.doMock('fs', () => ({ default: { readFileSync: read } }))
  return import('@/lib/puzzleSet')
}

afterEach(() => vi.doUnmock('fs'))

describe('allMateProblems', () => {
  it('slots the local Polgár set between real games and Lichess', async () => {
    const { allMateProblems, BUNDLED_MATES } = await loadWithLocalFile(() =>
      JSON.stringify([polgar]),
    )
    const all = allMateProblems()
    expect(all).toHaveLength(BUNDLED_MATES.length + 1)
    const at = all.indexOf(all.find((p) => p.id === 222)!)
    expect(all[at - 1].id).toBe(221)
    expect(all[at + 1].url).toMatch(/^https:\/\/lichess\.org\/training\//)
  })

  it('is just the bundled set without the local file', async () => {
    const { allMateProblems, BUNDLED_MATES } = await loadWithLocalFile(() => {
      throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    })
    expect(allMateProblems()).toEqual(BUNDLED_MATES)
  })
})
