import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { Kysely, SqliteDialect } from 'kysely'
import type { DbSchema } from '../types'
import { dataDir as getDataDir } from '../../dataDir'

const globalForDb = globalThis as typeof globalThis & {
  sqliteRaw?: Database.Database
  sqliteDb?: Kysely<DbSchema>
}

function getSqliteRaw(): Database.Database {
  if (!globalForDb.sqliteRaw) {
    const dataDir = getDataDir()
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const db = new Database(path.join(dataDir, 'blitzr.db'))
    db.pragma('journal_mode = WAL')
    // Needed for repertoire_moves' ON DELETE CASCADE (pruning a node drops its subtree).
    db.pragma('foreign_keys = ON')

    globalForDb.sqliteRaw = db
  }

  return globalForDb.sqliteRaw
}

export function getSqliteDb(): Kysely<DbSchema> {
  if (!globalForDb.sqliteDb) {
    globalForDb.sqliteDb = new Kysely<DbSchema>({
      dialect: new SqliteDialect({ database: getSqliteRaw() }),
    })
  }

  return globalForDb.sqliteDb
}
