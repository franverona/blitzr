import type { GameRepository } from '../types'
import { getSqliteDb } from './connection'
import { SqliteGameRepository } from './repository'

const globalForDb = globalThis as typeof globalThis & {
  sqliteRepository?: GameRepository
}

export function getSqliteRepository(): GameRepository {
  if (!globalForDb.sqliteRepository) {
    globalForDb.sqliteRepository = new SqliteGameRepository(getSqliteDb())
  }
  return globalForDb.sqliteRepository
}
