import { getSqliteDb } from './sqlite/connection'
import { SqliteGameRepository } from './sqlite/repository'

const globalForDb = globalThis as typeof globalThis & {
  repository?: SqliteGameRepository
}

export function getRepository(): SqliteGameRepository {
  // instanceof, not ??=: after a dev hot reload the cached instance is the old module's class, so
  // this swaps in the new code (and its migrations) without a restart. The connection is kept.
  if (!(globalForDb.repository instanceof SqliteGameRepository)) {
    globalForDb.repository = new SqliteGameRepository(getSqliteDb())
  }
  return globalForDb.repository
}
