import { describe, expect, it } from 'vitest'
import {
  drillStreak,
  drillWeek,
  localDay,
  lossReasons,
  suggestLesson,
  recentResults,
  repertoireDeviations,
} from '@/lib/today'
import type { Game, Lesson, RepertoireColor, RepertoireNode } from '@/lib/types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const now = new Date(2026, 9, 19, 12)
const daysAgo = (n: number) => now.getTime() / 1000 - n * 86400

function game(overrides: Partial<Game>): Game {
  return {
    id: 'g',
    url: '',
    pgn: '',
    movesSan: ['e4', 'e5'],
    initialFen: START,
    finalFen: null,
    timeControl: '180',
    timeClass: 'blitz',
    rules: 'chess',
    rated: true,
    endTime: daysAgo(1),
    whiteUsername: 'me',
    whiteRating: 1200,
    whiteResult: 'win',
    blackUsername: 'them',
    blackRating: 1200,
    blackResult: 'checkmated',
    myColor: 'white',
    myResult: 'win',
    isMine: true,
    ecoCode: null,
    ecoName: null,
    ecoUrl: null,
    archiveYm: '2026-10',
    createdAt: '',
    ...overrides,
  }
}

describe('recentResults', () => {
  it('counts the last 7 days and tracks rating per time class from the game before them', () => {
    const games = [
      game({ id: 'old', endTime: daysAgo(10), whiteRating: 1180 }),
      game({ id: 'a', endTime: daysAgo(3), whiteRating: 1190, myResult: 'loss' }),
      game({ id: 'b', endTime: daysAgo(1), whiteRating: 1205 }),
      game({
        id: 'r',
        timeClass: 'rapid',
        endTime: daysAgo(2),
        whiteRating: 1500,
        myResult: 'draw',
      }),
      game({ id: 'u', endTime: daysAgo(1), rated: false, whiteRating: 900 }),
    ]
    expect(recentResults(games, now)).toEqual({
      wins: 2,
      losses: 1,
      draws: 1,
      ratings: [
        { timeClass: 'blitz', rating: 1205, change: 25 },
        { timeClass: 'rapid', rating: 1500, change: 0 },
      ],
    })
  })

  it('skips time classes not played recently', () => {
    expect(recentResults([game({ endTime: daysAgo(30) })], now).ratings).toEqual([])
  })
})

describe('drillStreak', () => {
  const day = (n: number) => localDay(new Date(now.getTime() - n * 86400000))

  it('counts back from today', () => {
    expect(drillStreak([day(0), day(1), day(2), day(4)], now)).toBe(3)
  })

  it("still counts from yesterday when today isn't done yet", () => {
    expect(drillStreak([day(1), day(2)], now)).toBe(2)
  })

  it('is 0 after a missed day', () => {
    expect(drillStreak([day(2), day(3)], now)).toBe(0)
  })
})

describe('drillWeek', () => {
  const day = (n: number) => localDay(new Date(now.getTime() - n * 86400000))

  it('marks the last 7 days, oldest first', () => {
    expect(drillWeek([day(0), day(2), day(6), day(7)], now)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      true,
    ])
  })
})

describe('repertoireDeviations', () => {
  const node = (o: Partial<RepertoireNode>): RepertoireNode => ({
    id: 'e4',
    color: 'white',
    parentId: null,
    ply: 1,
    moveSan: 'e4',
    fen: '',
    createdAt: '',
    ...o,
  })
  const repertoire = new Map<RepertoireColor, RepertoireNode[]>([['white', [node({})]]])

  it('counts only games with a repertoire for their color, up to the limit', () => {
    const games = [
      game({ id: '1', movesSan: ['d4'] }),
      game({ id: '2', myColor: 'black' }),
      game({ id: '3', movesSan: ['e4'] }),
      game({ id: '4', movesSan: ['c4'] }),
    ]
    expect(repertoireDeviations(games, repertoire)).toEqual({ deviated: 2, considered: 3 })
    expect(repertoireDeviations(games, repertoire, 2)).toEqual({ deviated: 1, considered: 2 })
  })
})

describe('lossReasons', () => {
  it("groups losses by the user's own result code", () => {
    const lost = (code: string, myColor: Game['myColor'] = 'white') =>
      game({
        myResult: 'loss',
        myColor,
        whiteResult: myColor === 'white' ? code : 'win',
        blackResult: myColor === 'black' ? code : 'win',
      })
    expect(
      lossReasons([
        lost('timeout'),
        lost('timeout', 'black'),
        lost('checkmated'),
        lost('loss'),
        game({}),
      ]),
    ).toEqual([
      { reason: 'timeout', count: 2 },
      { reason: 'checkmate', count: 1 },
      { reason: 'other', count: 1 },
    ])
  })
})

describe('suggestLesson', () => {
  const lesson = (slug: string, moves: string[]) =>
    ({ slug, moves: moves.map((san) => ({ san, explanation: { en: '', es: '' } })) }) as Lesson

  it('picks the most-reached lesson, preferring the longer line on a tie', () => {
    const games = [
      game({ movesSan: ['e4', 'e5', 'Nf3'] }),
      game({ movesSan: ['e4', 'e5', 'Nf3'] }),
      game({ movesSan: ['d4'] }),
    ]
    const short = lesson('e4e5', ['e4', 'e5'])
    const long = lesson('e4e5nf3', ['e4', 'e5', 'Nf3'])
    expect(suggestLesson(games, [short, long, lesson('d4', ['d4'])])).toEqual({
      lesson: long,
      games: 2,
    })
    expect(suggestLesson(games, [lesson('c4', ['c4'])])).toBeNull()
  })
})
