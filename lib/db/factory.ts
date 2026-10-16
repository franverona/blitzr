import type { GameRepository } from './types'
import { getSqliteRepository } from './sqlite'

// Unimplemented backends throw rather than falling back to sqlite.
export function getRepository(): GameRepository {
  const dbType = (process.env.DB_TYPE ?? 'sqlite').trim().toLowerCase()

  switch (dbType) {
    case 'sqlite':
      return getSqliteRepository()
    default:
      throw new Error(`Unknown DB_TYPE="${dbType}". Only "sqlite" is implemented today.`)
  }
}
