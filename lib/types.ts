import type { Locale } from './i18n/locale'

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
  /** False for a pasted game the user didn't play; it's kept out of every
   *  stat, and `myColor` is just the board orientation. */
  isMine: boolean
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

export interface LessonMove {
  san: string
  explanation: Record<Locale, string>
}

/** A hand-authored opening (`lib/openingTheory.ts`) or endgame
 *  (`lib/endgameTheory.ts`) lesson. */
export interface Lesson {
  slug: string
  name: Record<Locale, string>
  initialFen: string
  /** Short line from `initialFen`. Endgame lessons run to mate (or promotion). */
  moves: LessonMove[]
  summary: Record<Locale, string>
  sourceUrl: string
  /** The side the lesson is framed around; Quiz mode defaults to it. */
  primaryColor: 'white' | 'black'
}

/** Own games that reached an opening lesson's exact move prefix — see
 *  `countGamesReachingLine()`. */
export interface LessonGameStats {
  games: number
  wins: number
  draws: number
  losses: number
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
  /** 1-indexed ply where the user left their own prepared moves; null if
   *  they never did (an unprepared opponent move doesn't count). */
  deviationPly: number | null
  deviationMove: string | null
  /** The move(s) the repertoire had prepared at the deviation point. */
  expectedMoves: string[] | null
}

export interface BestMove {
  from: string
  to: string
  san: string
  /** The engine's principal variation after this move (SAN). Empty if the PV
   *  was short or the analysis predates this field. */
  bestLine: string[]
}

/** Always from White's perspective (normalized from UCI's side-to-move
 *  score). Exactly one of cp/mate is non-null; `bestMove` is null for a
 *  terminal position. */
export interface PositionEval {
  cp: number | null
  mate: number | null
  bestMove: BestMove | null
}

/** One line from a MultiPV search, White's perspective. */
export interface EngineLine {
  cp: number | null
  mate: number | null
  move: BestMove
}

export interface GameAnalysis {
  gameId: string
  /** One eval per position; index 0 is the starting position. */
  evals: PositionEval[]
  analyzedAt: string
  /** Undefined for analyses saved before it was recorded. */
  movetimeMs?: number
}

export interface UnanalyzedGame {
  id: string
  initialFen: string
  movesSan: string[]
  gameLabel: string
}

export interface Blunder {
  /** 1-indexed ply of the move that caused the swing. */
  ply: number
  moveSan: string
  evalBefore: PositionEval
  evalAfter: PositionEval
  /** Centipawns lost by the mover; display only. */
  swingCp: number
  /** Win % (0-100) lost by the mover; drives detection and severity. */
  winDrop: number
}

export interface HangingPieceReason {
  kind: 'hanging-piece'
  piece: string
  square: string
  /** Set when the piece is defended but attacked by a cheaper piece (the cheapest one); absent
   *  when it's simply undefended. */
  attacker?: { piece: string; square: string }
}

export interface ForkReason {
  kind: 'fork'
  attackerPiece: string
  attackerSquare: string
  targets: { piece: string; square: string }[]
}

/** Absolute pins only (pinned to the king). */
export interface PinReason {
  kind: 'pin'
  pinnedPiece: string
  pinnedSquare: string
  pinnerPiece: string
  pinnerSquare: string
}

/** A slider attacking two pieces in line; the front one must move, exposing
 *  the back one. */
export interface SkewerReason {
  kind: 'skewer'
  attackerPiece: string
  attackerSquare: string
  frontPiece: string
  frontSquare: string
  backPiece: string
  backSquare: string
}

export type BlunderReason = HangingPieceReason | ForkReason | PinReason | SkewerReason

/** `side` is the player whose piece is at risk, not the attacker. */
export interface ChecklistFinding {
  side: MyColor
  reason: BlunderReason
}

/** A spot where games left the repertoire tree without a deviation (`findRepertoireGaps()`). */
export interface RepertoireGap {
  /** The moves still in the tree, from the start. */
  line: string[]
  /** What was played next, with nothing in the tree for it. */
  next: string
  games: number
}

/** 'punish': the opponent just blundered and the user's reply let it go. */
export type DrillSourceType = 'deviation' | 'blunder' | 'punish'

/** Only the review schedule is stored; the prompt is re-derived from the
 *  source game/repertoire/analysis at drill time (see lib/drill.ts). */
export interface DrillCard {
  gameId: string
  sourceType: DrillSourceType
  ply: number
  dueAt: string
  intervalDays: number
  easeFactor: number
  repetitions: number
  lastReviewedAt: string | null
  createdAt: string
}

export type DrillSchedule = Pick<
  DrillCard,
  'dueAt' | 'intervalDays' | 'easeFactor' | 'repetitions' | 'lastReviewedAt'
>

/** What `undoDrillAnswer()` needs: the schedule before the answer, and when the answer was saved. */
export interface DrillUndo {
  previous: DrillSchedule
  reviewedAt: string
}

export interface BlunderGroupStat {
  key: string
  label: string
  count: number
  /** Over real cp swings only; null if every blunder involved a forced mate. */
  avgSwingCp: number | null
}

export interface WorstBlunder {
  gameId: string
  gameLabel: string
  /** The game's starting position, for move numbers. */
  initialFen: string
  ply: number
  moveSan: string
  swingCp: number
  winDrop: number
  evalBefore: PositionEval
  evalAfter: PositionEval
  moveDescription: string
  /** null when no simple tactical pattern explains it. */
  reason: BlunderReason | null
  /** null if there's no suggestion or it matches the move played. */
  betterMove: string | null
}

export interface GameAccuracy {
  accuracy: number
  mistakes: number
  blunders: number
}

export interface AccuracyTrendPoint {
  gameId: string
  /** Unix seconds. */
  endTime: number
  accuracy: number
  gameLabel: string
}

export interface BlunderStats {
  totalGames: number
  analyzedGames: number
  totalBlunders: number
  byOpening: BlunderGroupStat[]
  byPiece: BlunderGroupStat[]
  /** By `detectBlunderReason()` kind, with 'none' when no simple pattern explains it. */
  byReason: BlunderGroupStat[]
  /** Opening, middlegame, endgame (`gamePhase()`), in that order. */
  byPhase: BlunderGroupStat[]
  worst: WorstBlunder[]
  /** Oldest first, one point per analyzed game in scope. */
  trend: AccuracyTrendPoint[]
  /** `findThrownWins()`: drawn or lost after reaching a winning position, newest first. */
  thrownWins: ThrownWin[]
}

export interface ThrownWin {
  gameId: string
  gameLabel: string
  initialFen: string
  result: 'draw' | 'loss'
  /** Position index (0 = start) where the user's win chance peaked; the move before it is `moveSan`. */
  peakPly: number
  moveSan: string | null
  peakEval: PositionEval
}

export interface DrillPrompt {
  gameId: string
  sourceType: DrillSourceType
  ply: number
  fen: string
  color: MyColor
  /** Deviation cards accept any prepared reply; blunder cards the engine's
   *  move, or another move `isNearBestMove()` accepts. */
  correctMoves: string[]
  /** Saved eval of `fen`, for grading other moves; null on deviation cards. */
  evalBefore: PositionEval | null
  gameLabel: string
  opponentUsername: string
  /** Null if Chess.com has none or the fetch failed. */
  opponentAvatarUrl: string | null
}
