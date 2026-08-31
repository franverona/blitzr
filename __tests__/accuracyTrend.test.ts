import { describe, expect, it } from 'vitest'
import { buildAccuracyTrend, rollingAverageAccuracy } from '@/lib/accuracyTrend'
import type { AccuracyTrendPoint, Game, GameAnalysis, PositionEval } from '@/lib/types'

function cp(value: number): PositionEval {
  return { cp: value, mate: null, bestMove: null }
}

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: Math.random().toString(36).slice(2),
    url: '',
    pgn: '',
    movesSan: ['e4', 'e5'],
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
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
    ecoCode: null,
    ecoName: null,
    ecoUrl: null,
    archiveYm: '2023-11',
    createdAt: '',
    ...overrides,
  }
}

function makeAnalysis(gameId: string, evals: PositionEval[]): GameAnalysis {
  return { gameId, evals, analyzedAt: '' }
}

function point(overrides: Partial<AccuracyTrendPoint>): AccuracyTrendPoint {
  return { gameId: 'g', endTime: 0, accuracy: 100, gameLabel: '', ...overrides }
}

describe('buildAccuracyTrend', () => {
  it('sorts by endTime oldest first regardless of input order', () => {
    const newer = makeGame({ endTime: 200, movesSan: ['e4'] })
    const older = makeGame({ endTime: 100, movesSan: ['e4'] })
    const analyses = new Map([
      [newer.id, makeAnalysis(newer.id, [cp(0), cp(0)])],
      [older.id, makeAnalysis(older.id, [cp(0), cp(0)])],
    ])

    const trend = buildAccuracyTrend([newer, older], analyses)
    expect(trend.map((p) => p.gameId)).toEqual([older.id, newer.id])
  })

  it('picks the accuracy for the account’s own color', () => {
    const asBlack = makeGame({ myColor: 'black', movesSan: ['e4', 'Nf6??'] })
    const analyses = new Map([[asBlack.id, makeAnalysis(asBlack.id, [cp(0), cp(10), cp(300)])]])

    const trend = buildAccuracyTrend([asBlack], analyses)
    expect(trend).toHaveLength(1)
    expect(trend[0].accuracy).toBeLessThan(100)
  })

  it('skips games with no movesSan or no saved analysis', () => {
    const unparsed = makeGame({ movesSan: null })
    const unanalyzed = makeGame({ movesSan: ['e4'] })
    const analyzed = makeGame({ movesSan: ['e4'] })
    const analyses = new Map([[analyzed.id, makeAnalysis(analyzed.id, [cp(0), cp(0)])]])

    const trend = buildAccuracyTrend([unparsed, unanalyzed, analyzed], analyses)
    expect(trend.map((p) => p.gameId)).toEqual([analyzed.id])
  })
})

describe('rollingAverageAccuracy', () => {
  it('averages exactly the trailing window once enough points exist', () => {
    const points = [10, 20, 30, 40].map((accuracy) => point({ accuracy }))
    expect(rollingAverageAccuracy(points, 2)).toEqual([10, 15, 25, 35])
  })

  it('shrinks the window for the first points instead of leaving them undefined', () => {
    const points = [point({ accuracy: 50 })]
    expect(rollingAverageAccuracy(points, 10)).toEqual([50])
  })
})
