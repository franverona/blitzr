import { describe, expect, it } from 'vitest'
import {
  drillStreak,
  drillWeek,
  localDay,
  lossReasons,
  isLessonDone,
  suggestEndgameLesson,
  suggestLesson,
  recentResults,
  scoreByRatingGap,
  scoreAfterLoss,
  repertoireDeviations,
  timeTroubleLosses,
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
    site: 'chesscom',
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
        { site: 'chesscom', timeClass: 'blitz', rating: 1205, change: 25 },
        { site: 'chesscom', timeClass: 'rapid', rating: 1500, change: 0 },
      ],
    })
  })

  it("keeps each site's ratings apart", () => {
    const games = [
      game({ id: 'c', endTime: daysAgo(2), whiteRating: 1200 }),
      game({ id: 'l', site: 'lichess', endTime: daysAgo(1), whiteRating: 1600 }),
    ]
    expect(recentResults(games, now).ratings).toEqual([
      { site: 'chesscom', timeClass: 'blitz', rating: 1200, change: 0 },
      { site: 'lichess', timeClass: 'blitz', rating: 1600, change: 0 },
    ])
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

describe('timeTroubleLosses', () => {
  it('counts losses on time, or with under a tenth of your clock after your last move', () => {
    const clk = (last: string) =>
      `1. e4 {[%clk 0:02:00]} 1... e5 {[%clk 0:02:00]} 2. Nf3 {[%clk ${last}]} *`
    const moves = ['e4', 'e5', 'Nf3']
    const resigned = (overrides: Partial<Game>) =>
      game({ myResult: 'loss', whiteResult: 'resigned', movesSan: moves, ...overrides })
    expect(
      timeTroubleLosses([
        game({ myResult: 'loss', whiteResult: 'timeout' }),
        // 10s of 180 after 2.Nf3.
        resigned({ pgn: clk('0:00:10') }),
        resigned({ pgn: clk('0:01:00') }),
        // Black's last move left 120s.
        resigned({ pgn: clk('0:00:10'), myColor: 'black', blackResult: 'resigned' }),
        resigned({ pgn: '1. e4 e5 2. Nf3 *' }),
        game({ pgn: clk('0:00:10'), movesSan: moves }),
      ]),
    ).toBe(2)
  })
})

describe('scoreAfterLoss', () => {
  // A loss, then a game 10 minutes later: 20 pairs give 10 losses "otherwise" and 10 games after.
  const pairs = (n: number, after: Game['myResult']) =>
    Array.from({ length: n }, (_, i) => [
      game({ id: `l${i}`, endTime: i * 86400, myResult: 'loss' }),
      game({ id: `a${i}`, endTime: i * 86400 + 600, myResult: after }),
    ]).flat()

  it('splits the score by whether the game before ended in a loss within the hour', () => {
    const games = [...pairs(10, 'win'), game({ endTime: 99 * 86400, timeControl: '1/86400' })]
    expect(scoreAfterLoss(games)).toEqual({
      afterLoss: { games: 10, score: 1 },
      otherwise: { games: 10, score: 0 },
    })
  })

  it('needs 10 games on each side', () => {
    expect(scoreAfterLoss(pairs(9, 'draw'))).toBeNull()
  })

  it('ignores a loss more than an hour before', () => {
    const late = pairs(10, 'win').map((g) =>
      g.id.startsWith('a') ? { ...g, endTime: g.endTime + 3600 } : g,
    )
    expect(scoreAfterLoss(late)).toBeNull()
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

describe('scoreByRatingGap', () => {
  const vs = (
    mine: number,
    theirs: number | null,
    myResult: Game['myResult'],
    site: Game['site'] = 'chesscom',
  ) =>
    game({ myColor: 'white', whiteRating: mine, blackRating: theirs, myResult, site, rated: true })

  it('scores games against stronger, similar and weaker opponents, per site', () => {
    const [chesscom, lichess] = scoreByRatingGap([
      vs(1500, 1650, 'loss'),
      vs(1500, 1601, 'draw'),
      vs(1500, 1600, 'win'),
      vs(1500, 1400, 'loss'),
      vs(1500, 1399, 'win'),
      vs(1500, null, 'win'),
      vs(1900, 1500, 'win', 'lichess'),
    ])
    expect(chesscom.site).toBe('chesscom')
    expect(chesscom.scores).toEqual({
      stronger: { games: 2, score: 0.25 },
      similar: { games: 2, score: 0.5 },
      weaker: { games: 1, score: 1 },
    })
    expect(lichess.site).toBe('lichess')
    expect(lichess.scores.weaker).toEqual({ games: 1, score: 1 })
    expect(lichess.scores.stronger).toEqual({ games: 0, score: 0 })
  })

  it('lists no site without rated games', () => {
    expect(scoreByRatingGap([vs(1500, null, 'win')])).toEqual([])
    // A bot or coach game carries ratings but isn't rated.
    expect(scoreByRatingGap([{ ...vs(1500, 2000, 'win'), rated: false }])).toEqual([])
  })
})

describe('isLessonDone', () => {
  it('needs the quiz, and a Play win only where the lesson has Play', () => {
    const quizOnly = { quizCompleted: true, playWon: null }
    expect(isLessonDone(quizOnly, false)).toBe(true)
    expect(isLessonDone(quizOnly, true)).toBe(false)
    expect(isLessonDone({ quizCompleted: true, playWon: { elo: 1400 } }, true)).toBe(true)
    expect(isLessonDone({ quizCompleted: false, playWon: { elo: null } }, true)).toBe(false)
    expect(isLessonDone(undefined, false)).toBe(false)
  })
})

describe('suggestEndgameLesson', () => {
  const lesson = (slug: string) => ({ slug }) as Lesson

  it('picks the most-reached unfinished lesson, the first listed on a tie', () => {
    const reached = [
      { lesson: lesson('done'), games: 9 },
      { lesson: lesson('philidor'), games: 6 },
      { lesson: lesson('lucena'), games: 6 },
      { lesson: lesson('never'), games: 0 },
    ]
    const progress = { done: { quizCompleted: true, playWon: { elo: null } } }
    expect(suggestEndgameLesson(reached, progress)?.lesson.slug).toBe('philidor')
  })

  it('returns null when nothing unfinished was reached', () => {
    expect(suggestEndgameLesson([{ lesson: lesson('never'), games: 0 }], {})).toBeNull()
  })
})
