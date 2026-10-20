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

export interface DrillReviewDaysTable {
  /** Local "YYYY-MM-DD". */
  day: string
}

export interface DbSchema {
  games: GamesTable
  sync_state: SyncStateTable
  repertoire_moves: RepertoireMovesTable
  game_analysis: GameAnalysisTable
  drill_cards: DrillCardsTable
  puzzle_progress: PuzzleProgressTable
  drill_review_days: DrillReviewDaysTable
}
