import { Kysely, sql } from 'kysely'
import type { DbSchema } from '../types'

// Module-level cache — reset on every hot-reload (module re-evaluation), so
// migrations re-run idempotently against the cached globalThis connection.
// Caching the in-flight promise (not just a boolean) means concurrent first
// calls await the same run instead of racing each other through the DDL
// below; clearing it on failure lets the next call retry instead of getting
// stuck.
let _migration: Promise<void> | null = null

export function ensureSchema(db: Kysely<DbSchema>): Promise<void> {
  if (!_migration) {
    _migration = runMigrations(db).catch((err) => {
      _migration = null
      throw err
    })
  }
  return _migration
}

async function runMigrations(db: Kysely<DbSchema>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      pgn TEXT NOT NULL,
      moves_san TEXT,
      initial_fen TEXT NOT NULL,
      final_fen TEXT,
      time_control TEXT NOT NULL,
      time_class TEXT NOT NULL,
      rules TEXT NOT NULL,
      rated INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      white_username TEXT NOT NULL,
      white_rating INTEGER,
      white_result TEXT NOT NULL,
      black_username TEXT NOT NULL,
      black_rating INTEGER,
      black_result TEXT NOT NULL,
      my_color TEXT NOT NULL,
      my_result TEXT NOT NULL,
      eco_code TEXT,
      eco_name TEXT,
      eco_url TEXT,
      archive_ym TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS games_end_time_idx ON games (end_time DESC)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS games_eco_code_idx ON games (eco_code)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS games_archive_ym_idx ON games (archive_ym)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS sync_state (
      archive_ym TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      game_count INTEGER NOT NULL,
      synced_at TEXT NOT NULL
    )
  `.execute(db)
}
