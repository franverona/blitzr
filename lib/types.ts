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

/** One move in a `Lesson`'s line, with a short plain-language note on why
 *  it's played — shown for whichever ply the lesson board is currently on.
 *  Keyed by `Locale` (not a plain string) since this is hand-authored
 *  content translated alongside the rest of the app, not generated text. */
export interface LessonMove {
  san: string
  explanation: Record<Locale, string>
}

/** A hand-authored lesson — either an opening (`lib/openingTheory.ts`) or an
 *  endgame (`lib/endgameTheory.ts`), same shape for both since they share
 *  every rendering component (`components/LessonPractice.tsx` and friends).
 *  Static content shipped with the app, not stored data, so this has no
 *  repository method of its own. */
export interface Lesson {
  slug: string
  name: Record<Locale, string>
  /** Openings always start from the standard position; endgames need their
   *  own constructed FEN (e.g. king + queen vs. lone king) — carried on the
   *  data itself rather than a hardcoded constant in the board component,
   *  since it now varies per lesson. */
  initialFen: string
  /** The line from `initialFen` — deliberately short (a handful of plies
   *  showing one natural continuation), not a deep repertoire line. For an
   *  endgame lesson this runs all the way to an actual checkmate or, for
   *  the pawn-ending lesson, to the pawn queening. */
  moves: LessonMove[]
  summary: Record<Locale, string>
  sourceUrl: string
  /** Which side this lesson is framed around — e.g. White for "King's Pawn
   *  Opening", Black for a defense named after Black's reply. Quiz mode
   *  defaults to practicing this color (board orientation still flippable)
   *  rather than always starting as White, since quizzing the *other* side
   *  by default reads as testing the wrong player for a lesson named after
   *  one side's plan. */
  primaryColor: 'white' | 'black'
}

/** How many of the account's own synced games actually reached (played at
 *  least as far as) an opening `Lesson`'s exact move sequence — see
 *  `countGamesReachingLine()` in `lib/openingTheory.ts`. Opening-specific
 *  (endgame lessons don't have an equivalent — a game doesn't "reach" an
 *  endgame position via a fixed move prefix from move 1 the way it does an
 *  opening line). Deliberately not
 *  matched via Chess.com's ECO code/name: a lesson's line is usually just a
 *  tabiya (e.g. the position right after 3.Bb5, before Black even replies),
 *  and real games almost always continue into a deeper, more specific named
 *  sub-variation — Chess.com then tags the *whole game* with that deeper
 *  ECO code/name, not the shallower one the lesson teaches. Matching on the
 *  actual move prefix instead sidesteps needing to know which of
 *  potentially dozens of ECO codes/names share a lesson's opening family. */
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
  /** Up to a few more plies the engine expects to follow this move (SAN),
   *  from its own principal variation — lets a "better was X" callout show
   *  *why* a quiet move matters even when the payoff isn't immediate (no
   *  hanging piece or fork to point to), by showing the short plan instead
   *  of just the first move. Empty when the engine's PV didn't extend far
   *  enough (e.g. near a forced mate) or the analysis predates this field. */
  bestLine: string[]
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

/** A synced game with no saved analysis yet — the minimal shape the bulk
 *  "Analyze all" action (`getUnanalyzedGames()`) needs to hand off to
 *  `analyzeGames()` (`lib/stockfish/analyze.ts`) and display progress. */
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
  /** How much worse the position got for the player who just moved, in
   *  centipawns (always positive — that's what makes it a blunder). */
  swingCp: number
}

/** A simple tactical explanation for why a move was a blunder — v1 only
 *  detects a piece left hanging (attacked, undefended, capturable for free).
 *  Plain strings rather than chess.js's `Square`/`PieceSymbol` types, same
 *  "types.ts stays chess.js-agnostic" convention `BestMove` follows — see
 *  `lib/hangingPiece.ts` for the detector and `describeHangingPieceReason()`
 *  for the plain-English rendering. */
export interface HangingPieceReason {
  kind: 'hanging-piece'
  piece: string
  square: string
}

/** A single opponent piece newly attacking 2+ of the mover's pieces at
 *  once — see `lib/tactics.ts` for the detector and `describeForkReason()`
 *  for the plain-English rendering. Same "plain strings, not chess.js
 *  types" convention as `HangingPieceReason`. */
export interface ForkReason {
  kind: 'fork'
  attackerPiece: string
  attackerSquare: string
  targets: { piece: string; square: string }[]
}

/** A piece newly pinned to its own king by an enemy sliding piece —
 *  absolute pins only (see `detectPin()`/`pinnedPieces()` in
 *  `lib/tactics.ts`), same "plain strings, not chess.js types" convention
 *  as `HangingPieceReason`/`ForkReason`. */
export interface PinReason {
  kind: 'pin'
  pinnedPiece: string
  pinnedSquare: string
  pinnerPiece: string
  pinnerSquare: string
}

/** A sliding piece newly attacking two enemy pieces in a straight line,
 *  front then back — the reverse of a pin: the front piece (equal or more
 *  valuable, or the king in check) is the one forced to move, exposing the
 *  back piece to capture — see `detectSkewer()`/`skewers()` in
 *  `lib/tactics.ts`, same "plain strings, not chess.js types" convention as
 *  the other reasons. */
export interface SkewerReason {
  kind: 'skewer'
  attackerPiece: string
  attackerSquare: string
  frontPiece: string
  frontSquare: string
  backPiece: string
  backSquare: string
}

/** Any of the simple tactical patterns a blunder might be explained by —
 *  see `detectBlunderReason()`/`describeBlunderReason()` in
 *  `lib/tactics.ts`, which every call site uses instead of the individual
 *  detectors. */
export type BlunderReason = HangingPieceReason | ForkReason | PinReason | SkewerReason

export type DrillSourceType = 'deviation' | 'blunder'

/** A spaced-repetition card, keyed by where it came from rather than a
 *  synthetic id — everything about *what* to show (FEN, accepted moves) is
 *  re-derived from the source game/repertoire/analysis at drill time, only
 *  the review schedule itself is durable state (see lib/drill.ts). */
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

export interface BlunderGroupStat {
  key: string
  label: string
  count: number
  /** Average swing in centipawns, over blunders with a real cp swing only —
   *  null if every blunder in the group was a swing into/out of a forced
   *  mate (not comparable to a pawn count, see lib/analysis.ts's evalToCp). */
  avgSwingCp: number | null
}

/** One own blunder, for the cross-game "worst blunders" list — carries
 *  enough to both display and link back to its source game. */
export interface WorstBlunder {
  gameId: string
  gameLabel: string
  ply: number
  moveSan: string
  swingCp: number
  evalBefore: PositionEval
  evalAfter: PositionEval
  /** Plain-English rendering of `moveSan`, e.g. "Queen captures pawn on f6,
   *  check" — see `describeMove()` in `lib/san.ts`. */
  moveDescription: string
  /** Why this was a blunder, if a simple tactical pattern explains it — null
   *  when no such pattern was detected (the eval swing might still be real,
   *  just not attributable to this v1 heuristic). See `lib/hangingPiece.ts`. */
  reason: BlunderReason | null
  /** The engine's suggested move instead, plain-English description and (if
   *  detectable) why it's better — see `describeBetterMove()` in
   *  `lib/tactics.ts`. Null if there's no suggestion or it matches what was
   *  actually played. */
  betterMove: string | null
}

export interface BlunderStats {
  totalGames: number
  analyzedGames: number
  totalBlunders: number
  byOpening: BlunderGroupStat[]
  byPiece: BlunderGroupStat[]
  worst: WorstBlunder[]
}

/** A `DrillCard` hydrated into something a drill session can actually show. */
export interface DrillPrompt {
  gameId: string
  sourceType: DrillSourceType
  ply: number
  fen: string
  color: MyColor
  /** One or more SAN moves that count as correct — deviation cards accept
   *  any of the repertoire's prepared replies, blunder cards accept only
   *  the engine's suggested move. */
  correctMoves: string[]
  /** For display above the board, e.g. "vs OMENrus98 · 17/07/2026". */
  gameLabel: string
  opponentUsername: string
  /** Fetched once per unique opponent in `getDrillDeck()` (`app/actions.ts`),
   *  same "resolve server-side, render client-side" split `PlayerAvatar.tsx`
   *  already uses on the game page — `buildDrillPrompt()` itself stays pure,
   *  no network calls. Null if Chess.com has none / the fetch failed. */
  opponentAvatarUrl: string | null
}
