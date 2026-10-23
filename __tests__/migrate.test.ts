import fs from 'fs'
import os from 'os'
import path from 'path'
import Database from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { DbSchema } from '@/lib/db/types'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzr-migrate-'))
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

// migrate.ts caches its run and backup flag per module, so each test gets its own copy.
async function freshEnsureSchema() {
  vi.resetModules()
  return (await import('@/lib/db/sqlite/migrate')).ensureSchema
}

// These write real files (VACUUM INTO). They usually take ~50ms, but on a busy CI runner the disk
// has stalled them past 30s, so the timeout only guards against a real hang.
describe('ensureSchema', { timeout: 60_000 }, () => {
  it('copies an existing database before altering it', async () => {
    const raw = new Database(path.join(dir, 'blitzr.db'))
    // A games table from before is_mine (only the columns the indexes need).
    raw.exec(`
      CREATE TABLE games (id TEXT PRIMARY KEY, end_time INTEGER, eco_code TEXT, archive_ym TEXT);
      INSERT INTO games (id) VALUES ('g1');
    `)
    const ensureSchema = await freshEnsureSchema()
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

  it('copies only once when a migration keeps failing', async () => {
    const dir2 = fs.mkdtempSync(path.join(dir, 'failing-'))
    const raw = new Database(path.join(dir2, 'blitzr.db'))
    // A view can't take ADD COLUMN, so the movetime_ms step fails on every run.
    raw.exec(`
      CREATE TABLE games (id TEXT PRIMARY KEY, end_time INTEGER, eco_code TEXT, archive_ym TEXT);
      CREATE VIEW game_analysis AS SELECT id AS game_id FROM games;
    `)
    const db = new Kysely<DbSchema>({ dialect: new SqliteDialect({ database: raw }) })
    const ensureSchema = await freshEnsureSchema()
    await expect(ensureSchema(db)).rejects.toThrow()
    await expect(ensureSchema(db)).rejects.toThrow()
    expect(fs.readdirSync(path.join(dir2, 'backups'))).toHaveLength(1)
    raw.close()
  })
})
