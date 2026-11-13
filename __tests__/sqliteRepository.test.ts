import Database from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { SqliteGameRepository } from '@/lib/db/sqlite/repository'
import type { DbSchema } from '@/lib/db/types'
import type { Game, PositionEval } from '@/lib/types'

// In-memory SQLite: exercises the real SQL, never touches data/blitzr.db.
const sqlite = new Database(':memory:')
const repo = new SqliteGameRepository(
  new Kysely<DbSchema>({ dialect: new SqliteDialect({ database: sqlite }) }),
)

function game(id: string, white: string, black: string, myColor: Game['myColor']): Game {
  return {
    id,
    url: '',
    pgn: '',
    movesSan: null,
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    finalFen: null,
    timeControl: '180',
    timeClass: 'blitz',
    rules: 'chess',
    rated: true,
    endTime: 1,
    whiteUsername: white,
    whiteRating: null,
    whiteResult: 'win',
    blackUsername: black,
    blackRating: null,
    blackResult: 'checkmated',
    myColor,
    myResult: myColor === 'white' ? 'win' : 'loss',
    isMine: true,
    ecoCode: null,
    ecoName: null,
    ecoUrl: null,
    archiveYm: '2026-09',
    site: 'chesscom',
    createdAt: '2026-09-01T00:00:00.000Z',
  }
}

beforeAll(async () => {
  await repo.upsertGames([
    game('1', 'fverona', 'alice', 'white'),
    game('2', 'bob', 'fverona', 'black'),
    game('3', 'fverona', 'veronica', 'white'),
    game('4', 'fverona', 'Under_Score', 'white'),
  ])
})

describe('SqliteGameRepository.listGames opponent search', () => {
  it('matches the opponent on either color', async () => {
    expect((await repo.listGames({ opponent: 'alice' })).games.map((g) => g.id)).toEqual(['1'])
    expect((await repo.listGames({ opponent: 'bob' })).games.map((g) => g.id)).toEqual(['2'])
  })

  it("doesn't match the account's own username", async () => {
    const { games, total } = await repo.listGames({ opponent: 'veron' })
    expect(games.map((g) => g.id)).toEqual(['3'])
    expect(total).toBe(1)
  })

  it('treats % and _ literally, not as LIKE wildcards', async () => {
    expect((await repo.listGames({ opponent: '_' })).games.map((g) => g.id)).toEqual(['4'])
    expect((await repo.listGames({ opponent: '%' })).total).toBe(0)
    // LIKE would read `_` as "any one character" and match alice.
    expect((await repo.listGames({ opponent: 'ali_e' })).total).toBe(0)
  })

  it('stays case-insensitive', async () => {
    expect((await repo.listGames({ opponent: 'under_score' })).games.map((g) => g.id)).toEqual([
      '4',
    ])
  })
})

describe('SqliteGameRepository.saveGameAnalysis', () => {
  it('overwrites an existing analysis, including its strength', async () => {
    await repo.saveGameAnalysis({ gameId: '1', evals: [], analyzedAt: 'a', movetimeMs: 150 })
    await repo.saveGameAnalysis({ gameId: '1', evals: [], analyzedAt: 'b', movetimeMs: 1000 })
    expect(await repo.getGameAnalysis('1')).toMatchObject({ analyzedAt: 'b', movetimeMs: 1000 })
  })

  it('gives a best move saved without bestLine an empty one', async () => {
    const legacy = { cp: 20, mate: null, bestMove: { from: 'e2', to: 'e4', san: 'e4' } }
    const evals = [legacy, { cp: 0, mate: null, bestMove: null }] as PositionEval[]
    await repo.saveGameAnalysis({ gameId: '1', evals, analyzedAt: 'a' })
    expect((await repo.getGameAnalysis('1'))?.evals).toEqual([
      { ...legacy, bestMove: { ...legacy.bestMove, bestLine: [] } },
      evals[1],
    ])
  })
})

describe('SqliteGameRepository "not me" games', () => {
  it('matches either player on search but never the result/color filters', async () => {
    await repo.upsertGames([{ ...game('nm', 'carol', 'dave', 'white'), isMine: false }])
    expect((await repo.listGames({ opponent: 'carol' })).games.map((g) => g.id)).toEqual(['nm'])
    expect((await repo.listGames({ opponent: 'dave' })).games.map((g) => g.id)).toEqual(['nm'])
    const wins = await repo.listGames({ result: 'win', limit: 5000 })
    expect(wins.games.some((g) => g.id === 'nm')).toBe(false)
    expect((await repo.getGame('nm'))?.isMine).toBe(false)
  })
})

describe('SqliteGameRepository.listManualGames', () => {
  it('returns only pasted games', async () => {
    await repo.upsertGames([
      { ...game('pasted', 'fverona', 'frank', 'white'), archiveYm: 'manual' },
    ])
    expect((await repo.listManualGames()).map((g) => g.id)).toEqual(['pasted'])
  })
})

describe('SqliteGameRepository.deleteGame', () => {
  it('removes the game and cascades to its analysis and drill cards', async () => {
    await repo.upsertGames([game('del', 'fverona', 'eve', 'white')])
    await repo.saveGameAnalysis({ gameId: 'del', evals: [], analyzedAt: 'a', movetimeMs: 300 })
    await repo.upsertDrillCard({
      gameId: 'del',
      sourceType: 'blunder',
      ply: 1,
      dueAt: 'x',
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lastReviewedAt: null,
      createdAt: 'x',
    })

    await repo.deleteGame('del')

    expect(await repo.getGame('del')).toBeUndefined()
    expect(await repo.getGameAnalysis('del')).toBeUndefined()
    expect((await repo.listDrillCards()).some((c) => c.gameId === 'del')).toBe(false)
  })
})

describe('SqliteGameRepository.getDrillCard', () => {
  it('finds a card by its (gameId, sourceType, ply) key', async () => {
    const card = {
      gameId: '1',
      sourceType: 'blunder' as const,
      ply: 7,
      dueAt: 'x',
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 1,
      lastReviewedAt: null,
      createdAt: 'x',
    }
    await repo.upsertDrillCard(card)
    expect(await repo.getDrillCard('1', 'blunder', 7)).toEqual(card)
    expect(await repo.getDrillCard('1', 'deviation', 7)).toBeUndefined()
    expect(await repo.getDrillCard('1', 'blunder', 8)).toBeUndefined()
  })
})

describe('SqliteGameRepository.deleteDrillCards', () => {
  it('deletes exactly the given keys', async () => {
    const card = (ply: number) => ({
      gameId: '2',
      sourceType: 'blunder' as const,
      ply,
      dueAt: 'x',
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lastReviewedAt: null,
      createdAt: 'x',
    })
    for (const ply of [1, 3, 5]) await repo.upsertDrillCard(card(ply))

    await repo.deleteDrillCards([
      { gameId: '2', sourceType: 'blunder', ply: 1 },
      { gameId: '2', sourceType: 'blunder', ply: 5 },
    ])

    const plies = (await repo.listDrillCards()).filter((c) => c.gameId === '2').map((c) => c.ply)
    expect(plies).toEqual([3])
  })
})

describe('SqliteGameRepository.upsertGames', () => {
  it('inserts a month too big for one statement and counts only new rows', async () => {
    const month = Array.from({ length: 1500 }, (_, i) => game(`big-${i}`, 'fverona', 'x', 'white'))
    expect(await repo.upsertGames(month)).toBe(1500)
    expect(await repo.upsertGames(month)).toBe(0)
  })
})

describe('SqliteGameRepository puzzle reveals', () => {
  it('lists reveals oldest first, keeping a puzzle in place when revealed again', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-20T10:00:00Z'))
      await repo.markPuzzleRevealed(7)
      vi.setSystemTime(new Date('2026-10-21T10:00:00Z'))
      await repo.markPuzzleRevealed(3)
      vi.setSystemTime(new Date('2026-10-22T10:00:00Z'))
      await repo.markPuzzleRevealed(7)
    } finally {
      vi.useRealTimers()
    }
    expect(await repo.listRevealedPuzzleIds()).toEqual([7, 3])
  })
})

describe('SqliteGameRepository drill review days', () => {
  it('records each day once', async () => {
    await repo.recordDrillReviewDay('2026-10-18')
    await repo.recordDrillReviewDay('2026-10-19')
    await repo.recordDrillReviewDay('2026-10-19')
    expect((await repo.listDrillReviewDays()).sort()).toEqual(['2026-10-18', '2026-10-19'])
  })
})

// VACUUM INTO writes a temp file: slow on a busy CI runner's disk (see migrate.test.ts).
describe('SqliteGameRepository.exportBackup', { timeout: 60_000 }, () => {
  it('returns a SQLite file holding the same data', async () => {
    const data = await repo.exportBackup()
    expect(Buffer.from(data.subarray(0, 15)).toString()).toBe('SQLite format 3')

    const restored = new Database(Buffer.from(data))
    const { count } = restored.prepare('SELECT count(*) AS count FROM games').get() as {
      count: number
    }
    expect(count).toBeGreaterThan(0)
    expect(count).toBe((await repo.listAllGames()).length)
    restored.close()
  })
})

describe('SqliteGameRepository practice games', () => {
  const practice: Game = {
    ...game('p1', 'fverona', 'Stockfish 1600', 'white'),
    archiveYm: 'practice',
    endTime: 2,
    practiceOf: { gameId: 'src', ply: 4 },
  }
  let totalBefore = 0

  beforeAll(async () => {
    // As connection.ts sets it, for the cascade. ensureSchema() runs once per module, so this
    // shares the file's database.
    sqlite.pragma('foreign_keys = ON')
    await repo.upsertGames([{ ...game('src', 'fverona', 'alice', 'white'), archiveYm: 'manual' }])
    totalBefore = (await repo.listGames()).total
    await repo.upsertGames([practice])
  })

  it('keeps them out of listAllGames() and listGames()', async () => {
    expect((await repo.listAllGames()).map((g) => g.id)).not.toContain('p1')
    const { games, total } = await repo.listGames()
    expect(games.map((g) => g.id)).not.toContain('p1')
    expect(total).toBe(totalBefore)
  })

  it('lists only them with practice: true', async () => {
    const { games, total } = await repo.listGames({ practice: true })
    expect(games.map((g) => g.id)).toEqual(['p1'])
    expect(total).toBe(1)
  })

  it('still finds them by id and by source', async () => {
    expect(await repo.getGame('p1')).toEqual(practice)
    expect((await repo.listPracticeGames('src')).map((g) => g.id)).toEqual(['p1'])
    expect((await repo.getGame('src'))?.practiceOf).toBeUndefined()
  })

  it('deletes them with their source game', async () => {
    await repo.deleteGame('src')
    expect(await repo.getGame('p1')).toBeUndefined()
  })
})

// Last, since it adds a game the other suites' counts don't expect.
describe('SqliteGameRepository.listGames site filter', () => {
  it('lists only the asked site', async () => {
    await repo.upsertGames([{ ...game('lichess-1', 'fverona', 'zed', 'white'), site: 'lichess' }])
    expect((await repo.listGames({ site: 'lichess' })).games.map((g) => g.id)).toEqual([
      'lichess-1',
    ])
    const chesscom = (await repo.listGames({ site: 'chesscom' })).games.map((g) => g.id)
    expect(chesscom).toContain('1')
    expect(chesscom).not.toContain('lichess-1')
  })
})

describe('SqliteGameRepository.upsertGames on an existing id', () => {
  it("refreshes a Lichess game's PGN and opening, and counts only new games", async () => {
    const stale = { ...game('lichess:abc', 'fverona', 'yan', 'white'), site: 'lichess' as const }
    expect(await repo.upsertGames([stale])).toBe(1)
    const fresh = { ...stale, pgn: '[%clk 0:03:00]', ecoCode: 'C50', ecoName: 'Italian Game' }
    expect(await repo.upsertGames([fresh])).toBe(0)
    expect(await repo.getGame('lichess:abc')).toMatchObject({
      pgn: '[%clk 0:03:00]',
      ecoName: 'Italian Game',
    })
    await repo.deleteGame('lichess:abc')
  })

  it('leaves other games as stored', async () => {
    expect(await repo.upsertGames([{ ...game('1', 'fverona', 'alice', 'white'), pgn: 'x' }])).toBe(
      0,
    )
    expect((await repo.getGame('1'))?.pgn).toBe('')
  })
})

describe('SqliteGameRepository lesson progress', () => {
  it('records a quiz completion once', async () => {
    await repo.markLessonQuizCompleted('quiz-lesson')
    await repo.markLessonQuizCompleted('quiz-lesson')
    expect((await repo.listLessonProgress())['quiz-lesson']).toEqual({
      quizCompleted: true,
      playWon: null,
    })
  })

  it('keeps the strongest Play win, full strength above any Elo', async () => {
    const best = async () => (await repo.listLessonProgress())['play-lesson'].playWon
    await repo.recordLessonPlayWin('play-lesson', 1400)
    await repo.recordLessonPlayWin('play-lesson', 1000)
    expect(await best()).toEqual({ elo: 1400 })
    await repo.recordLessonPlayWin('play-lesson', 1800)
    expect(await best()).toEqual({ elo: 1800 })
    await repo.recordLessonPlayWin('play-lesson', null)
    await repo.recordLessonPlayWin('play-lesson', 2500)
    expect(await best()).toEqual({ elo: null })
    expect((await repo.listLessonProgress())['play-lesson'].quizCompleted).toBe(false)
  })
})
