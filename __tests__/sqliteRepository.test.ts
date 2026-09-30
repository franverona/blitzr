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
