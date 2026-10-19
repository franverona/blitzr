import type {
  ArchiveSyncStatus,
  DrillCard,
  DrillSourceType,
  Game,
  GameAnalysis,
  MyColor,
  MyResult,
  RepertoireColor,
  RepertoireNode,
} from '../types'

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
  is_mine: number
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

export interface RepertoireMovesTable {
  id: string
  color: string
  parent_id: string | null
  ply: number
  move_san: string
  fen: string
  created_at: string
}

export interface GameAnalysisTable {
  game_id: string
  evals: string
  analyzed_at: string
  movetime_ms: number | null
}

export interface DrillCardsTable {
  game_id: string
  source_type: string
  ply: number
  due_at: string
  interval_days: number
  ease_factor: number
  repetitions: number
  last_reviewed_at: string | null
  created_at: string
}

export interface PuzzleProgressTable {
  puzzle_id: number
  solved_at: string
}

export interface DbSchema {
  games: GamesTable
  sync_state: SyncStateTable
  repertoire_moves: RepertoireMovesTable
  game_analysis: GameAnalysisTable
  drill_cards: DrillCardsTable
  puzzle_progress: PuzzleProgressTable
}

export type DbType = 'sqlite'

export interface GameRepository {
  /** Inserts games, skipping existing ids. Returns how many were new. */
  upsertGames(games: Game[]): Promise<number>
  /** `opponent` is a case-insensitive substring match on either player.
   *  `gameIds` restricts to that id set (the accuracy filter, computed in app
   *  code); an empty array returns nothing without querying. */
  listGames(params?: {
    limit?: number
    offset?: number
    opponent?: string
    result?: MyResult
    color?: MyColor
    rated?: boolean
    gameIds?: string[]
  }): Promise<{ games: Game[]; total: number }>
  listAllGames(): Promise<Game[]>
  getGame(id: string): Promise<Game | undefined>
  /** Cascades to the game's analysis and drill cards. */
  deleteGame(id: string): Promise<void>
  getArchiveSyncStatus(): Promise<ArchiveSyncStatus[]>
  markArchiveSynced(
    archiveYm: string,
    status: 'complete' | 'partial',
    gameCount: number,
  ): Promise<void>

  listRepertoireNodes(color: RepertoireColor): Promise<RepertoireNode[]>
  /** `id` is client-generated so the node can be added optimistically. */
  addRepertoireNode(node: RepertoireNode): Promise<void>
  /** Cascades to the node's subtree. */
  deleteRepertoireNode(id: string): Promise<void>

  getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined>
  saveGameAnalysis(analysis: GameAnalysis): Promise<void>
  listAllGameAnalyses(): Promise<GameAnalysis[]>

  listDrillCards(): Promise<DrillCard[]>
  /** Insert or replace, keyed by (gameId, sourceType, ply). */
  upsertDrillCard(card: DrillCard): Promise<void>
  deleteDrillCards(
    keys: { gameId: string; sourceType: DrillSourceType; ply: number }[],
  ): Promise<void>

  listSolvedPuzzleIds(): Promise<number[]>
  /** No-op if already solved, keeping the original solved_at. */
  markPuzzleSolved(puzzleId: number): Promise<void>

  /** A consistent snapshot of the whole database, in the backend's file format. */
  exportBackup(): Promise<Uint8Array<ArrayBuffer>>
}
