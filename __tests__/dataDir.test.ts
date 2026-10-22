import { afterEach, describe, expect, it, vi } from 'vitest'
import { dataDir } from '@/lib/dataDir'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('dataDir', () => {
  it('defaults to data/ under the base', () => {
    vi.stubEnv('BLITZR_DATA_DIR', '')
    expect(dataDir('/repo')).toBe('/repo/data')
  })

  it('resolves BLITZR_DATA_DIR against the base, or uses it as is when absolute', () => {
    vi.stubEnv('BLITZR_DATA_DIR', '../shared')
    expect(dataDir('/repo')).toBe('/shared')
    vi.stubEnv('BLITZR_DATA_DIR', '/var/blitzr')
    expect(dataDir('/repo')).toBe('/var/blitzr')
  })
})
