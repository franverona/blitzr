import { getSqliteDb } from './sqlite/connection'
import { SqliteGameRepository } from './sqlite/repository'

const globalForDb = globalThis as typeof globalThis & {
  repository?: SqliteGameRepository
}

export function getRepository(): SqliteGameRepository {
  globalForDb.repository ??= new SqliteGameRepository(getSqliteDb())
  return globalForDb.repository
}
