import type { ArchiveSyncStatus, Game } from '../types'

export interface GamesTable {
  id: string
  url: string
  pgn: string
  moves_san: string | null
  initial_fen: string
  final_fen: string | null
  time_control: string
  time_class: string
  rules: string
  rated: number
  end_time: number
  white_username: string
  white_rating: number | null
  white_result: string
  black_username: string
  black_rating: number | null
  black_result: string
  my_color: string
  my_result: string
  eco_code: string | null
  eco_name: string | null
  eco_url: string | null
  archive_ym: string
  created_at: string
}

export interface SyncStateTable {
  archive_ym: string
  status: string
  game_count: number
  synced_at: string
}

export interface DbSchema {
  games: GamesTable
  sync_state: SyncStateTable
}

export type DbType = 'sqlite'

export interface GameRepository {
  /** Insert games, ignoring any whose id already exists. Returns the number attempted. */
  upsertGames(games: Game[]): Promise<number>
  listGames(params?: { limit?: number; offset?: number }): Promise<{ games: Game[]; total: number }>
  /** Unpaginated — used for the openings aggregation, which needs every game. */
  listAllGames(): Promise<Game[]>
  getGame(id: string): Promise<Game | undefined>
  getArchiveSyncStatus(): Promise<ArchiveSyncStatus[]>
  markArchiveSynced(
    archiveYm: string,
    status: 'complete' | 'partial',
    gameCount: number,
  ): Promise<void>
}
