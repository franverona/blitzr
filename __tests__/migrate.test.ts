import fs from 'fs'
import os from 'os'
import path from 'path'
import Database from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { afterAll, describe, expect, it } from 'vitest'
import { ensureSchema } from '@/lib/db/sqlite/migrate'
import type { DbSchema } from '@/lib/db/types'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzr-migrate-'))
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('ensureSchema', () => {
  it('copies an existing database before altering it', async () => {
    const raw = new Database(path.join(dir, 'blitzr.db'))
    // A games table from before is_mine (only the columns the indexes need).
    raw.exec(`
      CREATE TABLE games (id TEXT PRIMARY KEY, end_time INTEGER, eco_code TEXT, archive_ym TEXT);
      INSERT INTO games (id) VALUES ('g1');
    `)
    await ensureSchema(new Kysely<DbSchema>({ dialect: new SqliteDialect({ database: raw }) }))

    const backups = fs.readdirSync(path.join(dir, 'backups'))
    expect(backups).toHaveLength(1)
    expect(backups[0]).toMatch(/^pre-migration-.*\.db$/)
    const copy = new Database(path.join(dir, 'backups', backups[0]), { readonly: true })
    const columns = copy.pragma('table_info(games)') as { name: string }[]
    expect(columns.map((c) => c.name)).not.toContain('is_mine')
    expect(copy.prepare('SELECT id FROM games').all()).toEqual([{ id: 'g1' }])
    copy.close()
    raw.close()
  })
})
