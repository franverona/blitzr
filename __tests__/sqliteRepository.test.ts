import Database from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { beforeAll, describe, expect, it } from 'vitest'
import { SqliteGameRepository } from '@/lib/db/sqlite/repository'
import type { DbSchema } from '@/lib/db/types'
import type { Game } from '@/lib/types'

// In-memory SQLite: exercises the real SQL, never touches data/blitzr.db.
const repo = new SqliteGameRepository(
  new Kysely<DbSchema>({ dialect: new SqliteDialect({ database: new Database(':memory:') }) }),
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

describe('SqliteGameRepository.upsertGames', () => {
  it('inserts a month too big for one statement and counts only new rows', async () => {
    const month = Array.from({ length: 1500 }, (_, i) => game(`big-${i}`, 'fverona', 'x', 'white'))
    expect(await repo.upsertGames(month)).toBe(1500)
    expect(await repo.upsertGames(month)).toBe(0)
  })
})
