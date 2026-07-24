import { describe, expect, it } from 'vitest'
import { countGamesReachingLine, getOpeningLesson, OPENING_LESSONS } from '@/lib/openingTheory'
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

describe('getOpeningLesson', () => {
  it('finds a lesson by slug', () => {
    expect(getOpeningLesson('kings-pawn-opening')).toBe(OPENING_LESSONS[0])
  })

  it('returns undefined for an unknown slug', () => {
    expect(getOpeningLesson('not-a-real-opening')).toBeUndefined()
  })
})

describe('OPENING_LESSONS content', () => {
  it('has a distinct, non-empty English and Spanish name/summary for every lesson', () => {
    for (const lesson of OPENING_LESSONS) {
      expect(lesson.name.en.length).toBeGreaterThan(0)
      expect(lesson.name.es.length).toBeGreaterThan(0)
      expect(lesson.summary.en.length).toBeGreaterThan(0)
      expect(lesson.summary.es.length).toBeGreaterThan(0)
      expect(lesson.name.es).not.toBe(lesson.name.en)
    }
  })

  it('has a distinct, non-empty English and Spanish explanation for every move', () => {
    for (const lesson of OPENING_LESSONS) {
      for (const move of lesson.moves) {
        expect(move.explanation.en.length).toBeGreaterThan(0)
        expect(move.explanation.es.length).toBeGreaterThan(0)
        expect(move.explanation.es).not.toBe(move.explanation.en)
      }
    }
  })
})

describe('countGamesReachingLine', () => {
  const moves = ['e4', 'e5', 'Nf3']

  it('counts games whose movesSan starts with the given line, tallying results', () => {
    const games = [
      makeGame({ movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], myResult: 'win' }),
      makeGame({ movesSan: ['e4', 'e5', 'Nf3', 'Nc6'], myResult: 'draw' }),
      makeGame({ movesSan: ['e4', 'e5', 'Nf3'], myResult: 'loss' }),
    ]

    expect(countGamesReachingLine(games, moves)).toEqual({
      games: 3,
      wins: 1,
      draws: 1,
      losses: 1,
    })
  })

  it('excludes games that deviated before the end of the line', () => {
    const games = [
      makeGame({ movesSan: ['e4', 'c5'] }), // Sicilian, not 1...e5
      makeGame({ movesSan: ['d4', 'd5'] }), // different first move entirely
      makeGame({ movesSan: ['e4', 'e5'] }), // shorter than the line itself
    ]

    expect(countGamesReachingLine(games, moves)).toEqual({
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    })
  })

  it('skips games with unparseable movetext (movesSan is null)', () => {
    const games = [makeGame({ movesSan: null })]

    expect(countGamesReachingLine(games, moves)).toEqual({
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    })
  })
})
