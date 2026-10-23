import { describe, expect, it } from 'vitest'
import {
  buildDrillPrompt,
  dueDrillCards,
  findBlunderCandidates,
  findDeviationCandidates,
  findPunishCandidates,
  getSessionSize,
  isNearBestMove,
  newCardSchedule,
  reconcileDrillDeck,
  scheduleReview,
  selectSessionCards,
} from '@/lib/drill'
import { formatDate } from '@/lib/dates'
import { buildPositions } from '@/lib/positions'
import type {
  DrillCard,
  Game,
  GameAnalysis,
  PositionEval,
  RepertoireColor,
  RepertoireNode,
} from '@/lib/types'

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
    isMine: true,
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

function withBest(evaluation: PositionEval): PositionEval {
  return { ...evaluation, bestMove: { from: 'a1', to: 'a2', san: 'Ra2', bestLine: [] } }
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

  it('keeps one card per deviation position, on the oldest game', () => {
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const repertoireByColor = new Map<RepertoireColor, RepertoireNode[]>([['white', [e4]]])
    const games = [
      makeGame({ id: 'newer', movesSan: ['d4', 'd5'], endTime: 200 }),
      makeGame({ id: 'older', movesSan: ['c4', 'e5'], endTime: 100 }),
      makeGame({ id: 'black', movesSan: ['d4', 'd5'], myColor: 'black', endTime: 50 }),
    ]

    expect(findDeviationCandidates(games, repertoireByColor)).toEqual([
      { gameId: 'older', sourceType: 'deviation', ply: 1 },
    ])
  })

  it('keeps the card on the game that already has it when an older game joins', () => {
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const repertoireByColor = new Map<RepertoireColor, RepertoireNode[]>([['white', [e4]]])
    const games = [
      makeGame({ id: 'owner', movesSan: ['d4', 'd5'], endTime: 200 }),
      makeGame({ id: 'pasted-older', movesSan: ['c4', 'e5'], endTime: 100 }),
    ]
    const card = {
      gameId: 'owner',
      sourceType: 'deviation' as const,
      ply: 1,
      ...newCardSchedule(new Date(0)),
      createdAt: '',
    }

    expect(findDeviationCandidates(games, repertoireByColor, [card])).toEqual([
      { gameId: 'owner', sourceType: 'deviation', ply: 1 },
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
    const evals = [cp(0), withBest(cp(10)), withBest(cp(250)), cp(-50)]
    const analysesByGameId = new Map<string, GameAnalysis>([
      ['g1', { gameId: 'g1', evals, analyzedAt: '' }],
    ])

    expect(findBlunderCandidates([game], analysesByGameId)).toEqual([
      { gameId: 'g1', sourceType: 'blunder', ply: 3 },
    ])
  })

  it('skips blunders with no saved best move, which buildDrillPrompt() could not show', () => {
    const game = makeGame({ movesSan: ['e4', 'e5', 'Qh5??'], myColor: 'white' })
    const evals = [cp(0), cp(10), cp(20), cp(-300)]
    const analysesByGameId = new Map<string, GameAnalysis>([
      ['g1', { gameId: 'g1', evals, analyzedAt: '' }],
    ])
    expect(findBlunderCandidates([game], analysesByGameId)).toEqual([])
  })

  it('skips games without saved analysis', () => {
    const game = makeGame({})
    expect(findBlunderCandidates([game], new Map())).toEqual([])
  })

  it('makes one card for the same best move missed on consecutive own plies', () => {
    const game = makeGame({ movesSan: ['a3', 'h6', 'b3', 'g6', 'c3', 'f6'], myColor: 'white' })
    const best = (san: string): PositionEval => ({
      cp: 0,
      mate: null,
      bestMove: { from: 'a1', to: 'a2', san, bestLine: [] },
    })
    // Own plies 1, 3 and 5 all blunder; 1 and 3 miss the same move, 5 a different one.
    const evals = [best('Qxd5'), cp(-300), best('Qxd5'), cp(-600), best('Nf3'), cp(-900), cp(-900)]
    const analysesByGameId = new Map<string, GameAnalysis>([
      ['g1', { gameId: 'g1', evals, analyzedAt: '' }],
    ])

    expect(findBlunderCandidates([game], analysesByGameId).map((c) => c.ply)).toEqual([1, 5])
  })
})

describe('findPunishCandidates', () => {
  // ply 2 (black's f6) throws the game away; ply 3 is the user's reply.
  const game = makeGame({ movesSan: ['e4', 'f6', 'd4'], myColor: 'white' })
  const analyses = (afterReply: number) =>
    new Map<string, GameAnalysis>([
      [
        'g1',
        {
          gameId: 'g1',
          evals: [cp(20), cp(30), withBest(cp(400)), cp(afterReply)],
          analyzedAt: '',
        },
      ],
    ])

  it("flags a reply to the opponent's blunder that let most of it go", () => {
    expect(findPunishCandidates([game], analyses(250))).toEqual([
      { gameId: 'g1', sourceType: 'punish', ply: 3 },
    ])
  })

  it('skips a near-best reply, and one that was itself a blunder (its blunder card covers it)', () => {
    expect(findPunishCandidates([game], analyses(390))).toEqual([])
    expect(findPunishCandidates([game], analyses(-100))).toEqual([])
    expect(findBlunderCandidates([game], analyses(-100)).map((c) => c.ply)).toEqual([3])
  })

  it('hydrates a punish card with the engine reply, and drops it once it no longer qualifies', () => {
    const card = { gameId: 'g1', sourceType: 'punish' as const, ply: 3 }
    const prompt = buildDrillPrompt(card, game, new Map(), analyses(250))
    expect(prompt).toMatchObject({ sourceType: 'punish', ply: 3, correctMoves: ['Ra2'] })
    expect(buildDrillPrompt(card, game, new Map(), analyses(390))).toBeNull()
  })

  it("ignores the user's own blunders", () => {
    const mine = makeGame({ movesSan: ['e4', 'f6', 'd4'], myColor: 'black' })
    expect(findPunishCandidates([mine], analyses(250))).toEqual([])
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
      evalBefore: null,
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
      { cp: 40, mate: null, bestMove: { from: 'g1', to: 'f3', san: 'Nf3', bestLine: [] } },
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
      evalBefore: evals[2],
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

describe('isNearBestMove', () => {
  const whiteToMoveFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const blackToMoveFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

  it('accepts a move that keeps nearly the same eval', () => {
    expect(isNearBestMove(whiteToMoveFen, cp(40), cp(25))).toBe(true)
  })

  it('rejects a move that loses real ground even if it is not a blunder', () => {
    expect(isNearBestMove(whiteToMoveFen, cp(40), cp(-80))).toBe(false)
  })

  it("judges Black's moves from Black's side", () => {
    expect(isNearBestMove(blackToMoveFen, cp(30), cp(40))).toBe(true)
    expect(isNearBestMove(blackToMoveFen, cp(30), cp(200))).toBe(false)
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

  it('sets dueAt to the start of the local day the new interval lands on', () => {
    const evening = new Date(2024, 0, 10, 21, 30)
    const missed = scheduleReview(
      { intervalDays: 6, easeFactor: 2.5, repetitions: 2 },
      false,
      evening,
    )
    expect(missed.dueAt).toBe(new Date(2024, 0, 11).toISOString())
    const known = scheduleReview(
      { intervalDays: 1, easeFactor: 2.5, repetitions: 1 },
      true,
      evening,
    )
    expect(known.dueAt).toBe(new Date(2024, 0, 16).toISOString())
  })
})

function makeCard(overrides: Partial<DrillCard>): DrillCard {
  return {
    gameId: 'g1',
    sourceType: 'blunder',
    ply: 1,
    dueAt: '2024-01-01T00:00:00.000Z',
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
    lastReviewedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('selectSessionCards', () => {
  it('sorts by dueAt ascending (most overdue first)', () => {
    const late = makeCard({ ply: 1, dueAt: '2024-01-03T00:00:00.000Z' })
    const early = makeCard({ ply: 2, dueAt: '2024-01-01T00:00:00.000Z' })
    const mid = makeCard({ ply: 3, dueAt: '2024-01-02T00:00:00.000Z' })

    expect(selectSessionCards([late, early, mid], 10)).toEqual([early, mid, late])
  })

  it('caps the result at max', () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      makeCard({ ply: i + 1, dueAt: `2024-01-0${i + 1}T00:00:00.000Z` }),
    )
    expect(selectSessionCards(cards, 2)).toHaveLength(2)
  })
})

describe('getSessionSize', () => {
  it('accepts only the offered sizes, defaulting to 15', () => {
    expect(getSessionSize('25')).toBe(25)
    expect(getSessionSize(undefined)).toBe(15)
    expect(getSessionSize('1000')).toBe(15)
  })
})

describe('reconcileDrillDeck', () => {
  const now = new Date('2024-02-01T00:00:00.000Z')

  it('keeps matching cards with their schedule, prunes stale ones and adds new candidates', () => {
    const kept = makeCard({ ply: 3, repetitions: 4, dueAt: '2024-03-01T00:00:00.000Z' })
    const stale = makeCard({ ply: 5 })
    const {
      live,
      stale: pruned,
      added,
    } = reconcileDrillDeck(
      [kept, stale],
      [
        { gameId: 'g1', sourceType: 'blunder', ply: 3 },
        { gameId: 'g2', sourceType: 'deviation', ply: 2 },
      ],
      now,
    )

    expect(pruned).toEqual([stale])
    expect(added).toEqual([
      {
        gameId: 'g2',
        sourceType: 'deviation',
        ply: 2,
        ...newCardSchedule(now),
        createdAt: now.toISOString(),
      },
    ])
    expect(live).toEqual([kept, ...added])
  })

  it('treats the same ply from another source as a different card', () => {
    const { stale, added } = reconcileDrillDeck(
      [makeCard({ sourceType: 'blunder', ply: 3 })],
      [{ gameId: 'g1', sourceType: 'deviation', ply: 3 }],
      now,
    )
    expect(stale).toHaveLength(1)
    expect(added).toHaveLength(1)
  })
})

describe('dueDrillCards', () => {
  const now = new Date('2024-02-01T00:00:00.000Z')
  const due = makeCard({ gameId: 'g1', ply: 1, dueAt: '2024-02-01T00:00:00.000Z' })
  const future = makeCard({ gameId: 'g1', ply: 2, dueAt: '2024-02-02T00:00:00.000Z' })
  const deviation = makeCard({ gameId: 'g2', ply: 3, sourceType: 'deviation' })
  const orphan = makeCard({ gameId: 'gone', ply: 4 })
  const openingOf = (id: string) => ({ g1: 'Italian Game', g2: 'Sicilian Defense' })[id]
  const cards = [due, future, deviation, orphan]

  it('keeps cards due by now, including exactly now', () => {
    expect(dueDrillCards(cards, now, undefined, openingOf)).toEqual([due, deviation, orphan])
  })

  it('filters by source type and opening; a missing game fails the opening filter', () => {
    expect(dueDrillCards(cards, now, { sourceType: 'deviation' }, openingOf)).toEqual([deviation])
    expect(dueDrillCards(cards, now, { opening: 'Italian Game' }, openingOf)).toEqual([due])
  })
})
