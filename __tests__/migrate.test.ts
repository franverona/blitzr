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
    // A games table from before is_mine (only the columns the indexes and updates need).
    raw.exec(`
      CREATE TABLE games (id TEXT PRIMARY KEY, end_time INTEGER, eco_code TEXT, archive_ym TEXT,
        time_control TEXT, time_class TEXT);
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
    const migrated = (raw.pragma('table_info(games)') as { name: string }[]).map((c) => c.name)
    expect(migrated).toEqual(expect.arrayContaining(['is_mine', 'source_game_id', 'source_ply']))
    raw.close()
  })

  it('forgets Lichess months synced before openings and clocks were fetched', async () => {
    const raw = new Database(':memory:')
    raw.exec(`
      CREATE TABLE sync_state (archive_ym TEXT PRIMARY KEY, status TEXT NOT NULL,
        game_count INTEGER NOT NULL, synced_at TEXT NOT NULL);
      INSERT INTO sync_state VALUES
        ('lichess:2026-09', 'complete', 3, '2026-11-01T00:00:00.000Z'),
        ('lichess:2026-10', 'complete', 3, '2026-11-07T00:00:00.000Z'),
        ('2026-09', 'complete', 3, '2026-11-01T00:00:00.000Z');
    `)
    const ensureSchema = await freshEnsureSchema()
    await ensureSchema(new Kysely<DbSchema>({ dialect: new SqliteDialect({ database: raw }) }))
    expect(raw.prepare('SELECT archive_ym FROM sync_state ORDER BY archive_ym').all()).toEqual([
      { archive_ym: '2026-09' },
      { archive_ym: 'lichess:2026-10' },
    ])
    raw.close()
  })

  it('files Lichess UltraBullet games stored as bullet as UltraBullet', async () => {
    const raw = new Database(':memory:')
    raw.exec(`
      CREATE TABLE games (id TEXT PRIMARY KEY, end_time INTEGER, eco_code TEXT, archive_ym TEXT,
        time_control TEXT, time_class TEXT);
      INSERT INTO games (id, time_control, time_class) VALUES
        ('lichess:ultra', '15+0', 'bullet'),
        ('lichess:bullet', '60+0', 'bullet'),
        ('cc', '15', 'bullet');
    `)
    const ensureSchema = await freshEnsureSchema()
    await ensureSchema(new Kysely<DbSchema>({ dialect: new SqliteDialect({ database: raw }) }))
    expect(raw.prepare('SELECT id, time_class FROM games ORDER BY id').all()).toEqual([
      { id: 'cc', time_class: 'bullet' },
      { id: 'lichess:bullet', time_class: 'bullet' },
      { id: 'lichess:ultra', time_class: 'ultraBullet' },
    ])
    raw.close()
  })

  it('copies only once when a migration keeps failing', async () => {
    const dir2 = fs.mkdtempSync(path.join(dir, 'failing-'))
    const raw = new Database(path.join(dir2, 'blitzr.db'))
    // A view can't take ADD COLUMN, so the movetime_ms step fails on every run.
    raw.exec(`
      CREATE TABLE games (id TEXT PRIMARY KEY, end_time INTEGER, eco_code TEXT, archive_ym TEXT,
        time_control TEXT, time_class TEXT);
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
