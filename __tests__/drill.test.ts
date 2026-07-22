import { describe, expect, it } from 'vitest'
import {
  buildDrillPrompt,
  findBlunderCandidates,
  findDeviationCandidates,
  newCardSchedule,
  scheduleReview,
} from '@/lib/drill'
import { formatDate } from '@/lib/dates'
import { buildPositions } from '@/lib/positions'
import type { Game, GameAnalysis, PositionEval, RepertoireColor, RepertoireNode } from '@/lib/types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: 'g1',
    url: '',
    pgn: '',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6'],
    initialFen: START_FEN,
    finalFen: null,
    timeControl: '180',
    timeClass: 'blitz',
    rules: 'chess',
    rated: true,
    endTime: 1_700_000_000,
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

function node(overrides: Partial<RepertoireNode>): RepertoireNode {
  return {
    id: Math.random().toString(36).slice(2),
    color: 'white',
    parentId: null,
    ply: 1,
    moveSan: 'e4',
    fen: '',
    createdAt: '',
    ...overrides,
  }
}

function cp(value: number): PositionEval {
  return { cp: value, mate: null, bestMove: null }
}

describe('findDeviationCandidates', () => {
  it('flags a game that deviates from the repertoire', () => {
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const e5 = node({ id: 'e5', parentId: 'e4', ply: 2, moveSan: 'e5' })
    const nf3 = node({ id: 'nf3', parentId: 'e5', ply: 3, moveSan: 'Nf3' })
    const repertoireByColor = new Map<RepertoireColor, RepertoireNode[]>([['white', [e4, e5, nf3]]])
    const game = makeGame({ movesSan: ['e4', 'e5', 'Nc3'] })

    expect(findDeviationCandidates([game], repertoireByColor)).toEqual([
      { gameId: 'g1', sourceType: 'deviation', ply: 3 },
    ])
  })

  it('skips games with no repertoire for their color, and games fully in book', () => {
    const inBook = makeGame({ id: 'in-book', movesSan: ['e4', 'e5'] })
    const noRepertoire = makeGame({ id: 'no-rep', myColor: 'black' })
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const e5 = node({ id: 'e5', parentId: 'e4', ply: 2, moveSan: 'e5' })
    const repertoireByColor = new Map<RepertoireColor, RepertoireNode[]>([['white', [e4, e5]]])

    expect(findDeviationCandidates([inBook, noRepertoire], repertoireByColor)).toEqual([])
  })
})

describe('findBlunderCandidates', () => {
  it('flags only the plies the user actually played', () => {
    const game = makeGame({ movesSan: ['e4', 'Nf6??', 'Qh5??'], myColor: 'white' })
    // ply 1 (white e4): fine. ply 2 (black Nf6??): blunder, but the opponent's.
    // ply 3 (white Qh5??): blunder, and it's mine — only this one should count.
    const evals = [cp(0), cp(10), cp(250), cp(-50)]
    const analysesByGameId = new Map<string, GameAnalysis>([
      ['g1', { gameId: 'g1', evals, analyzedAt: '' }],
    ])

    expect(findBlunderCandidates([game], analysesByGameId)).toEqual([
      { gameId: 'g1', sourceType: 'blunder', ply: 3 },
    ])
  })

  it('skips games without saved analysis', () => {
    const game = makeGame({})
    expect(findBlunderCandidates([game], new Map())).toEqual([])
  })
})

describe('buildDrillPrompt', () => {
  it('hydrates a deviation card with the position before the deviation and the accepted moves', () => {
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const e5 = node({ id: 'e5', parentId: 'e4', ply: 2, moveSan: 'e5' })
    const nf3 = node({ id: 'nf3', parentId: 'e5', ply: 3, moveSan: 'Nf3' })
    const bc4 = node({ id: 'bc4', parentId: 'e5', ply: 3, moveSan: 'Bc4' })
    const repertoireByColor = new Map<RepertoireColor, RepertoireNode[]>([
      ['white', [e4, e5, nf3, bc4]],
    ])
    const game = makeGame({ movesSan: ['e4', 'e5', 'Nc3'] })
    const positions = buildPositions(game.initialFen, game.movesSan!)

    const prompt = buildDrillPrompt(
      { gameId: 'g1', sourceType: 'deviation', ply: 3 },
      game,
      repertoireByColor,
      new Map(),
    )

    expect(prompt).toEqual({
      gameId: 'g1',
      sourceType: 'deviation',
      ply: 3,
      fen: positions[2],
      color: 'white',
      correctMoves: ['Nf3', 'Bc4'],
      gameLabel: `vs opp · ${formatDate(game.endTime)}`,
      opponentUsername: 'opp',
      opponentAvatarUrl: null,
    })
  })

  it('hydrates a blunder card with the position before the blunder and the engine bestMove', () => {
    const game = makeGame({ movesSan: ['e4', 'e5', 'Qh5'] })
    // evals[2] is the position right before Qh5 — that's where bestMove
    // ("what should have been played instead") belongs.
    const evals: PositionEval[] = [
      cp(20),
      cp(30),
      { cp: 40, mate: null, bestMove: { from: 'g1', to: 'f3', san: 'Nf3' } },
      cp(-260),
    ]
    const analysesByGameId = new Map<string, GameAnalysis>([
      ['g1', { gameId: 'g1', evals, analyzedAt: '' }],
    ])
    const positions = buildPositions(game.initialFen, game.movesSan!)

    const prompt = buildDrillPrompt(
      { gameId: 'g1', sourceType: 'blunder', ply: 3 },
      game,
      new Map(),
      analysesByGameId,
    )

    expect(prompt).toEqual({
      gameId: 'g1',
      sourceType: 'blunder',
      ply: 3,
      fen: positions[2],
      color: 'white',
      correctMoves: ['Nf3'],
      gameLabel: `vs opp · ${formatDate(game.endTime)}`,
      opponentUsername: 'opp',
      opponentAvatarUrl: null,
    })
  })

  it('returns null when the card no longer matches its source (repertoire changed)', () => {
    const game = makeGame({ movesSan: ['e4', 'e5', 'Nc3'] })
    // Repertoire no longer has anything prepared at move 3 — not a deviation anymore.
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const repertoireByColor = new Map<RepertoireColor, RepertoireNode[]>([['white', [e4]]])

    const prompt = buildDrillPrompt(
      { gameId: 'g1', sourceType: 'deviation', ply: 3 },
      game,
      repertoireByColor,
      new Map(),
    )
    expect(prompt).toBeNull()
  })
})

describe('newCardSchedule', () => {
  it('is due immediately with SM-2 defaults', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')
    expect(newCardSchedule(now)).toEqual({
      dueAt: now.toISOString(),
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lastReviewedAt: null,
    })
  })
})

describe('scheduleReview', () => {
  const now = new Date('2024-01-01T00:00:00.000Z')

  it('schedules 1 day, then 6 days, then interval*ease on successive correct answers', () => {
    let schedule = scheduleReview({ intervalDays: 0, easeFactor: 2.5, repetitions: 0 }, true, now)
    expect(schedule).toMatchObject({ intervalDays: 1, repetitions: 1, easeFactor: 2.6 })

    schedule = scheduleReview(schedule, true, now)
    expect(schedule).toMatchObject({ intervalDays: 6, repetitions: 2, easeFactor: 2.7 })

    schedule = scheduleReview(schedule, true, now)
    expect(schedule).toMatchObject({ intervalDays: Math.round(6 * 2.7), repetitions: 3 })
  })

  it('resets repetitions and interval on an incorrect answer, and lowers ease', () => {
    const afterTwoCorrect = { intervalDays: 6, easeFactor: 2.7, repetitions: 2 }
    const schedule = scheduleReview(afterTwoCorrect, false, now)
    expect(schedule).toMatchObject({ intervalDays: 1, repetitions: 0, easeFactor: 2.5 })
  })

  it('floors the ease factor at 1.3 rather than letting it go lower', () => {
    const lowEase = { intervalDays: 1, easeFactor: 1.35, repetitions: 0 }
    const schedule = scheduleReview(lowEase, false, now)
    expect(schedule.easeFactor).toBe(1.3)
  })

  it('sets dueAt to now plus the new interval', () => {
    const schedule = scheduleReview({ intervalDays: 0, easeFactor: 2.5, repetitions: 0 }, true, now)
    expect(schedule.dueAt).toBe(new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString())
  })
})
