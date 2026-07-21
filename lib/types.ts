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
