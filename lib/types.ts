export type MyColor = 'white' | 'black'
export type MyResult = 'win' | 'draw' | 'loss'

export interface Game {
  id: string
  url: string
  pgn: string
  movesSan: string[] | null
  initialFen: string
  finalFen: string | null
  timeControl: string
  timeClass: string
  rules: string
  rated: boolean
  endTime: number
  whiteUsername: string
  whiteRating: number | null
  whiteResult: string
  blackUsername: string
  blackRating: number | null
  blackResult: string
  myColor: MyColor
  myResult: MyResult
  ecoCode: string | null
  ecoName: string | null
  ecoUrl: string | null
  archiveYm: string
  createdAt: string
}

export interface ArchiveSyncStatus {
  archiveYm: string
  status: 'complete' | 'partial'
  gameCount: number
  syncedAt: string
}

export interface OpeningLine {
  ecoName: string
  ecoUrl: string | null
  games: number
  wins: number
  draws: number
  losses: number
}

export interface OpeningFamily {
  ecoCode: string | null
  label: string
  games: number
  wins: number
  draws: number
  losses: number
  whiteGames: number
  whiteScore: number
  blackGames: number
  blackScore: number
  lines: OpeningLine[]
}

export interface SyncResult {
  archivesSynced: number
  gamesUpserted: number
}

export type RepertoireColor = 'white' | 'black'

export interface RepertoireNode {
  id: string
  color: RepertoireColor
  parentId: string | null
  ply: number
  moveSan: string
  fen: string
  createdAt: string
}

export interface RepertoireDiffResult {
  /** How many plies of the game matched the repertoire before it left book. */
  inBookPlies: number
  /** The ply (1-indexed) where the user played outside their own prepared
   *  moves — null if they never deviated (either stayed in book the whole
   *  game, or the game left book because of an unprepared opponent move). */
  deviationPly: number | null
  deviationMove: string | null
  /** The move(s) the repertoire had prepared at the deviation point. */
  expectedMoves: string[] | null
}

/** The engine's suggested move from a position: `from`/`to` for drawing a
 *  board arrow, `san` for display in text (blunder lists, etc). */
export interface BestMove {
  from: string
  to: string
  san: string
}

/** A single position's engine evaluation, always from White's perspective
 *  (UCI reports "score cp/mate" from the side-to-move's perspective, so this
 *  is normalized before storage — see lib/stockfish/client.ts). Exactly one
 *  of cp/mate is non-null. `bestMove` is null for a terminal position with
 *  no legal moves. */
export interface PositionEval {
  cp: number | null
  mate: number | null
  bestMove: BestMove | null
}

export interface GameAnalysis {
  gameId: string
  /** One eval per position, same length/indexing as a game's positions
   *  array (movesSan.length + 1: index 0 is the starting position). */
  evals: PositionEval[]
  analyzedAt: string
}

export interface Blunder {
  /** 1-indexed ply of the move that caused the swing. */
  ply: number
  moveSan: string
  evalBefore: PositionEval
  evalAfter: PositionEval
  /** How much worse the position got for the player who just moved, in
   *  centipawns (always positive — that's what makes it a blunder). */
  swingCp: number
}
