import type { GameRepository } from './types'
import { getSqliteRepository } from './sqlite'

// DB_TYPE selects the backend, defaulting to "sqlite" so no config is needed
// for the common case. Only sqlite is implemented today — this switch is
// where a future postgres/ sibling (mirroring lib/db/sqlite/) would register
// itself. Unimplemented backends throw here rather than silently falling
// back to sqlite.
export function getRepository(): GameRepository {
  const dbType = (process.env.DB_TYPE ?? 'sqlite').trim().toLowerCase()

  switch (dbType) {
    case 'sqlite':
      return getSqliteRepository()
    default:
      throw new Error(`Unknown DB_TYPE="${dbType}". Only "sqlite" is implemented today.`)
  }
}
