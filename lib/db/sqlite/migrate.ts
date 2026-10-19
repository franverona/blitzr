import fs from 'fs'
import path from 'path'
import { Kysely, sql } from 'kysely'
import type { DbSchema } from '../types'

// Caches the in-flight promise so concurrent first calls share one run;
// cleared on failure so the next call retries.
let _migration: Promise<void> | null = null
// Survives failed runs, so a migration that keeps failing copies once, not per retry.
let _backedUp = false

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
  // A fresh database has nothing to lose, so only an existing one is copied.
  const existing = await sql`SELECT 1 FROM sqlite_master WHERE name = 'games'`.execute(db)
  const fresh = existing.rows.length === 0
  async function alter(statement: ReturnType<typeof sql>) {
    if (!fresh && !_backedUp) {
      await backupBeforeMigration(db)
      _backedUp = true
    }
    await statement.execute(db)
  }

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

  await sql`
    CREATE TABLE IF NOT EXISTS repertoire_moves (
      id TEXT PRIMARY KEY,
      color TEXT NOT NULL,
      parent_id TEXT REFERENCES repertoire_moves(id) ON DELETE CASCADE,
      ply INTEGER NOT NULL,
      move_san TEXT NOT NULL,
      fen TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `.execute(db)

  await sql`
    CREATE INDEX IF NOT EXISTS repertoire_moves_color_parent_idx
    ON repertoire_moves (color, parent_id)
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS game_analysis (
      game_id TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
      evals TEXT NOT NULL,
      analyzed_at TEXT NOT NULL
    )
  `.execute(db)

  // Added after the table shipped — SQLite has no ADD COLUMN IF NOT EXISTS,
  // so check table_info first to stay idempotent.
  const gameColumns = await sql<{ name: string }>`PRAGMA table_info(games)`.execute(db)
  if (!gameColumns.rows.some((c) => c.name === 'is_mine')) {
    await alter(sql`ALTER TABLE games ADD COLUMN is_mine INTEGER NOT NULL DEFAULT 1`)
  }

  const analysisColumns = await sql<{ name: string }>`PRAGMA table_info(game_analysis)`.execute(db)
  if (!analysisColumns.rows.some((c) => c.name === 'movetime_ms')) {
    await alter(sql`ALTER TABLE game_analysis ADD COLUMN movetime_ms INTEGER`)
  }

  await sql`
    CREATE TABLE IF NOT EXISTS drill_cards (
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      ply INTEGER NOT NULL,
      due_at TEXT NOT NULL,
      interval_days REAL NOT NULL,
      ease_factor REAL NOT NULL,
      repetitions INTEGER NOT NULL,
      last_reviewed_at TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (game_id, source_type, ply)
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS drill_cards_due_at_idx ON drill_cards (due_at)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS puzzle_progress (
      puzzle_id INTEGER PRIMARY KEY,
      solved_at TEXT NOT NULL
    )
  `.execute(db)
}

/** Copies the database to `backups/pre-migration-<time>.db` next to it; no-op in memory. */
async function backupBeforeMigration(db: Kysely<DbSchema>): Promise<void> {
  const { rows } = await sql<{ name: string; file: string }>`PRAGMA database_list`.execute(db)
  const file = rows.find((r) => r.name === 'main')?.file
  if (!file) return
  const dir = path.join(path.dirname(file), 'backups')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  // VACUUM INTO writes a consistent copy that includes the WAL.
  await sql`VACUUM INTO ${path.join(dir, `pre-migration-${stamp}.db`)}`.execute(db)
}
