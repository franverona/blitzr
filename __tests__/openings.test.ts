import { describe, expect, it } from 'vitest'
import { buildOpeningFamilies, ecoFamilyLabel } from '@/lib/openings'
import type { Game } from '@/lib/types'

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: Math.random().toString(36).slice(2),
    url: '',
    pgn: '',
    movesSan: [],
    initialFen: '',
    finalFen: null,
    timeControl: '180',
    timeClass: 'blitz',
    rules: 'chess',
    rated: true,
    endTime: 0,
    whiteUsername: 'me',
    whiteRating: null,
    whiteResult: 'win',
    blackUsername: 'opp',
    blackRating: null,
    blackResult: 'checkmated',
    myColor: 'white',
    myResult: 'win',
    ecoCode: 'C50',
    ecoName: 'Italian Game: 3...Bc5',
    ecoUrl: null,
    archiveYm: '2023-11',
    createdAt: '',
    ...overrides,
  }
}

describe('ecoFamilyLabel', () => {
  it('strips the move list after the colon', () => {
    expect(ecoFamilyLabel('Italian Game: 3...Bc5')).toBe('Italian Game')
  })

  it('returns the whole string when there is no colon', () => {
    expect(ecoFamilyLabel('Italian Game')).toBe('Italian Game')
  })
})

describe('buildOpeningFamilies', () => {
  it('aggregates games under their ECO code, with per-color scores', () => {
    const games = [
      makeGame({ ecoCode: 'C50', myColor: 'white', myResult: 'win' }),
      makeGame({ ecoCode: 'C50', myColor: 'white', myResult: 'draw' }),
      makeGame({ ecoCode: 'C50', myColor: 'black', myResult: 'loss' }),
    ]

    const [family] = buildOpeningFamilies(games)
    expect(family.ecoCode).toBe('C50')
    expect(family.games).toBe(3)
    expect(family.wins).toBe(1)
    expect(family.draws).toBe(1)
    expect(family.losses).toBe(1)
    expect(family.whiteGames).toBe(2)
    expect(family.whiteScore).toBeCloseTo(0.75)
    expect(family.blackGames).toBe(1)
    expect(family.blackScore).toBeCloseTo(0)
  })

  it('nests distinct named lines under their shared ECO code', () => {
    const games = [
      makeGame({ ecoCode: 'C50', ecoName: 'Italian Game: 3...Bc5', myResult: 'win' }),
      makeGame({ ecoCode: 'C50', ecoName: 'Italian Game: 3...Nf6', myResult: 'loss' }),
    ]

    const [family] = buildOpeningFamilies(games)
    expect(family.lines).toHaveLength(2)
    expect(family.lines.map((l) => l.ecoName).sort()).toEqual([
      'Italian Game: 3...Bc5',
      'Italian Game: 3...Nf6',
    ])
  })

  it('buckets games with no ECO code under a null-coded "Unknown" family', () => {
    const games = [makeGame({ ecoCode: null, ecoName: null })]
    const [family] = buildOpeningFamilies(games)
    expect(family.ecoCode).toBeNull()
    expect(family.label).toBe('Unknown opening')
  })

  it('sorts families by game count, descending', () => {
    const games = [
      makeGame({ ecoCode: 'B20' }),
      makeGame({ ecoCode: 'C50' }),
      makeGame({ ecoCode: 'C50' }),
    ]
    const families = buildOpeningFamilies(games)
    expect(families.map((f) => f.ecoCode)).toEqual(['C50', 'B20'])
  })
})
