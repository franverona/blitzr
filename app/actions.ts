'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { buildAccuracyTrend, recentAccuracy } from '@/lib/accuracyTrend'
import { buildBlunderStats } from '@/lib/blunders'
import { ChesscomApiError, fetchPlayerAvatar } from '@/lib/chesscom/client'
import { endOfDaySeconds, formatDate, startOfDaySeconds } from '@/lib/dates'
import { getChesscomUsername, hasChesscomUsername } from '@/lib/config'
import { getRepository } from '@/lib/db'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import type { ListGamesParams } from '@/lib/db/sqlite/repository'
import {
  buildDrillPrompt,
  findBlunderCandidates,
  dueDrillCards,
  filterDrillCards,
  findDeviationCandidates,
  findMissedMateCandidates,
  findPunishCandidates,
  reconcileDrillDeck,
  scheduleReview,
  troubleCards,
  getSessionSize,
  selectSessionCards,
} from '@/lib/drill'
import type { DrillCandidate } from '@/lib/drill'
import { findDuplicateGame, parseManualGame, type ManualGameSide } from '@/lib/manualGame'
import { summarizeMoveQuality } from '@/lib/moveQuality'
import { buildOpeningFamilies, ecoFamilyLabel, unknownOpeningLabel } from '@/lib/openings'
import { allMateProblems, getMateProblem } from '@/lib/puzzleSet'
import { OPENING_LESSONS, countGamesReachingLine } from '@/lib/openingTheory'
import { buildPositions, isStandardChess, startsFromStandardPosition } from '@/lib/positions'
import { plyLabel } from '@/lib/san'
import { findRepertoireGaps } from '@/lib/repertoire'
import { isSyncStale, listPendingArchives, syncArchive } from '@/lib/sync'
import { describeBlunderReason } from '@/lib/tactics'
import {
  drillStreak,
  drillWeek,
  gameReview,
  localDay,
  lossReasons,
  recentResults,
  repertoireDeviations,
  suggestLesson,
} from '@/lib/today'
import {
  isValidAnalysis,
  isValidDrillAnswer,
  isValidDrillUndo,
  normalizeRepertoireNode,
} from '@/lib/validate'
import type {
  ArchiveSyncStatus,
  BlunderStats,
  DrillPrompt,
  DrillSourceType,
  DrillUndo,
  Game,
  GameAccuracy,
  GameAnalysis,
  LessonGameStats,
  MyColor,
  MyResult,
  OpeningFamily,
  PositionEval,
  RepertoireColor,
  RepertoireGap,
  RepertoireNode,
  UnanalyzedGame,
} from '@/lib/types'

// Full-table reads, memoized per request since one page can call several
// actions that need them.
const cachedListAllGames = cache(() => getRepository().listAllGames())
const cachedListAllGameAnalyses = cache(() => getRepository().listAllGameAnalyses())

// Sync keeps every variant: engine features need standard rules, opening
// features also need the standard starting position. Stats skip "not me" games.
const cachedStandardGames = cache(async () => (await cachedListAllGames()).filter(isStandardChess))
const cachedMyStandardGames = cache(async () =>
  (await cachedStandardGames()).filter((g) => g.isMine),
)
const cachedStandardStartGames = cache(async () =>
  (await cachedListAllGames()).filter((g) => g.isMine && startsFromStandardPosition(g)),
)

// A malformed or repeated `?from=`/`?to=` is ignored rather than filtering out every game.
function dayBound(value: unknown, toSeconds: (date: string) => number): number | undefined {
  const seconds = typeof value === 'string' && value ? toSeconds(value) : NaN
  return Number.isFinite(seconds) ? seconds : undefined
}

function filterByDateRange(games: Game[], filters?: { from?: string; to?: string }): Game[] {
  const fromSeconds = dayBound(filters?.from, startOfDaySeconds)
  const toSeconds = dayBound(filters?.to, endOfDaySeconds)
  if (fromSeconds === undefined && toSeconds === undefined) return games
  return games.filter(
    (g) =>
      (fromSeconds === undefined || g.endTime >= fromSeconds) &&
      (toSeconds === undefined || g.endTime <= toSeconds),
  )
}

export async function listGames(
  params: ListGamesParams = {},
): Promise<{ games: Game[]; total: number }> {
  return getRepository().listGames(params)
}

export async function getGame(id: string): Promise<Game | undefined> {
  return getRepository().getGame(id)
}

export async function listOpenings(): Promise<OpeningFamily[]> {
  const games = await cachedStandardStartGames()
  return buildOpeningFamilies(games)
}

export async function getLessonGameStats(moves: string[]): Promise<LessonGameStats> {
  const games = await cachedStandardStartGames()
  return countGamesReachingLine(games, moves)
}

export async function getBlunderStats(filters?: {
  from?: string
  to?: string
}): Promise<BlunderStats> {
  const [allGames, analyses] = await Promise.all([
    cachedMyStandardGames(),
    cachedListAllGameAnalyses(),
  ])
  const games = filterByDateRange(allGames, filters)
  const analysesByGameId = new Map(analyses.map((a) => [a.gameId, a]))
  return {
    ...buildBlunderStats(games, analysesByGameId),
    trend: buildAccuracyTrend(games, analysesByGameId),
  }
}

export async function getArchiveSyncStatus(): Promise<ArchiveSyncStatus[]> {
  return getRepository().getArchiveSyncStatus()
}

type ActionResult = { ok: true } | { ok: false; error: string }

type SyncError = { ok: false; error: string }

function syncError(err: unknown): SyncError {
  console.error(err)
  const s = getStrings()
  if (err instanceof ChesscomApiError && err.status === 429) {
    return { ok: false, error: s.sync.rateLimited }
  }
  if (err instanceof ChesscomApiError && err.status === 404) {
    return { ok: false, error: s.sync.userNotFound(getChesscomUsername()) }
  }
  return { ok: false, error: s.sync.failed }
}

/** Step 1 of a sync; the client then calls syncArchiveMonth() per month to
 *  show progress. Errors are returned, not thrown, as in addManualGame(). */
export async function listArchivesToSync(): Promise<{ ok: true; archives: string[] } | SyncError> {
  if (!hasChesscomUsername()) return { ok: false, error: getStrings().sync.noUsername }
  try {
    return { ok: true, archives: await listPendingArchives() }
  } catch (err) {
    return syncError(err)
  }
}

export async function syncArchiveMonth(
  archiveYm: string,
): Promise<{ ok: true; gamesUpserted: number } | SyncError> {
  if (!/^\d{4}-\d{2}$/.test(archiveYm)) return { ok: false, error: getStrings().sync.failed }
  try {
    const gamesUpserted = await syncArchive(archiveYm)
    // Per month, so a first sync fills the list as it goes.
    revalidatePath('/games')
    revalidatePath('/openings')
    revalidatePath('/')
    return { ok: true, gamesUpserted }
  } catch (err) {
    return syncError(err)
  }
}

/** Gets a fresh id, so a later sync can never overwrite it. */
export async function addManualGame(
  pgn: string,
  side: ManualGameSide = 'auto',
): Promise<{ ok: true; gameId: string } | { ok: false; error: string }> {
  // Returned, not thrown: Next hides thrown Server Action messages in
  // production, and the dialog needs parseManualGame()'s reason.
  // Only 'auto' needs the username; an explicit side works without one.
  if (side === 'auto' && !hasChesscomUsername()) {
    return { ok: false, error: getStrings().sync.noUsername }
  }
  let game: Game
  try {
    game = parseManualGame(pgn, side === 'auto' ? getChesscomUsername() : '', side)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '' }
  }
  if (findDuplicateGame(game, await cachedListAllGames())) {
    return { ok: false, error: getStrings().manualGame.duplicate }
  }
  await getRepository().upsertGames([game])
  revalidatePath('/games')
  return { ok: true, gameId: game.id }
}

/** Synced games aren't deletable: the next sync would bring them back. */
export async function deleteManualGame(id: string): Promise<void> {
  const repo = getRepository()
  const game = await repo.getGame(id)
  if (game?.archiveYm !== 'manual') return
  await repo.deleteGame(id)
  for (const path of ['/', '/games', '/openings', '/blunders', '/drill']) revalidatePath(path)
}

export async function exportDatabaseBackup(): Promise<
  { ok: true; data: Uint8Array<ArrayBuffer> } | { ok: false; error: string }
> {
  try {
    return { ok: true, data: await getRepository().exportBackup() }
  } catch (err) {
    console.error(err)
    return { ok: false, error: getStrings().settings.backupFailed }
  }
}

export async function listRepertoire(color: RepertoireColor): Promise<RepertoireNode[]> {
  return getRepository().listRepertoireNodes(color)
}

export async function getRepertoireGaps(color: RepertoireColor): Promise<RepertoireGap[]> {
  if (color !== 'white' && color !== 'black') return []
  const [games, nodes] = await Promise.all([
    cachedStandardStartGames(),
    getRepository().listRepertoireNodes(color),
  ])
  return findRepertoireGaps(games, color, nodes)
}

export async function addRepertoireMove(node: RepertoireNode): Promise<ActionResult> {
  const error = getStrings().repertoire.failedToSave
  try {
    const repo = getRepository()
    const parent =
      node.parentId === null
        ? undefined
        : (await repo.listRepertoireNodes(node.color)).find((n) => n.id === node.parentId)
    const valid = normalizeRepertoireNode(node, parent)
    if (!valid) return { ok: false, error }
    await repo.addRepertoireNode(valid)
  } catch (err) {
    console.error(err)
    return { ok: false, error }
  }
  revalidatePath('/repertoire')
  return { ok: true }
}

export async function deleteRepertoireMove(id: string): Promise<ActionResult> {
  const error = getStrings().repertoire.failedToDelete
  if (typeof id !== 'string') return { ok: false, error }
  try {
    await getRepository().deleteRepertoireNode(id)
  } catch (err) {
    console.error(err)
    return { ok: false, error }
  }
  revalidatePath('/repertoire')
  return { ok: true }
}

export async function getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined> {
  return getRepository().getGameAnalysis(gameId)
}

export async function saveGameAnalysis(
  gameId: string,
  evals: PositionEval[],
  movetimeMs: number,
): Promise<ActionResult> {
  const error = getStrings().analysisPanel.saveFailed
  try {
    const game = await getRepository().getGame(gameId)
    if (!game?.movesSan || !isValidAnalysis(evals, game.movesSan.length, movetimeMs)) {
      return { ok: false, error }
    }
    await getRepository().saveGameAnalysis({
      gameId,
      evals,
      analyzedAt: new Date().toISOString(),
      movetimeMs,
    })
  } catch (err) {
    console.error(err)
    return { ok: false, error }
  }
  revalidatePath(`/games/${gameId}`)
  revalidatePath('/blunders')
  revalidatePath('/games')
  revalidatePath('/')
  return { ok: true }
}

export async function getUnanalyzedGames(): Promise<UnanalyzedGame[]> {
  const [games, analyses] = await Promise.all([cachedStandardGames(), cachedListAllGameAnalyses()])
  const analyzedIds = new Set(analyses.map((a) => a.gameId))

  // Newest first; `filter()` copies, so sorting can't mutate the cache.
  return games
    .filter((g) => g.movesSan && !analyzedIds.has(g.id))
    .sort((a, b) => b.endTime - a.endTime)
    .map((g) => {
      const opponent = g.myColor === 'white' ? g.blackUsername : g.whiteUsername
      return {
        id: g.id,
        initialFen: g.initialFen,
        movesSan: g.movesSan as string[],
        gameLabel: `vs ${opponent} · ${formatDate(g.endTime)}`,
      }
    })
}

/** Own-side accuracy and mistake/blunder counts per analyzed game. */
export async function getGameAccuracyById(): Promise<Record<string, GameAccuracy>> {
  const [games, analyses] = await Promise.all([
    cachedMyStandardGames(),
    cachedListAllGameAnalyses(),
  ])
  const analysesByGameId = new Map(analyses.map((a) => [a.gameId, a]))

  const result: Record<string, GameAccuracy> = {}
  for (const game of games) {
    const analysis = analysesByGameId.get(game.id)
    if (!analysis || !game.movesSan) continue
    const summary = summarizeMoveQuality(analysis.evals, game.movesSan, game.initialFen)
    const mine = game.myColor === 'white' ? summary.white : summary.black
    result[game.id] = {
      accuracy: mine.accuracy,
      mistakes: mine.counts.mistake,
      blunders: mine.counts.blunder,
    }
  }
  return result
}

function openingLabel(game: Game): string {
  return game.ecoName ? ecoFamilyLabel(game.ecoName) : unknownOpeningLabel()
}

/** Adds new drill candidates and prunes stale cards; every deck read goes through it. */
async function reconcileDrillCards() {
  const repo = getRepository()
  const [games, standardStartGames, whiteNodes, blackNodes, analyses, existingCards] =
    await Promise.all([
      cachedMyStandardGames(),
      cachedStandardStartGames(),
      repo.listRepertoireNodes('white'),
      repo.listRepertoireNodes('black'),
      cachedListAllGameAnalyses(),
      repo.listDrillCards(),
    ])

  const gamesById = new Map(games.map((g) => [g.id, g]))
  const repertoireByColor = new Map<RepertoireColor, RepertoireNode[]>([
    ['white', whiteNodes],
    ['black', blackNodes],
  ])
  const analysesByGameId = new Map(analyses.map((a) => [a.gameId, a]))

  const candidates: DrillCandidate[] = [
    ...findDeviationCandidates(standardStartGames, repertoireByColor, existingCards),
    ...findBlunderCandidates(games, analysesByGameId),
    ...findPunishCandidates(games, analysesByGameId),
    ...findMissedMateCandidates(games, analysesByGameId),
  ]
  const now = new Date()
  const { live: liveCards, stale, added } = reconcileDrillDeck(existingCards, candidates, now)

  await Promise.all([
    ...(stale.length > 0 ? [repo.deleteDrillCards(stale)] : []),
    ...added.map((c) => repo.upsertDrillCard(c)),
  ])

  return { liveCards, gamesById, repertoireByColor, analysesByGameId, now }
}

/**
 * Syncs the drill deck with current data (adds new candidates, prunes stale
 * cards) and returns the next session's prompts. Runs on every /drill load.
 */
export async function getDrillDeck(filters?: {
  sourceType?: DrillSourceType
  opening?: string
}): Promise<{
  prompts: DrillPrompt[]
  totalCards: number
  dueCount: number
  /** `troubleCards()` under the same filters, due or not. */
  troubles: DrillPrompt[]
}> {
  const { liveCards, gamesById, repertoireByColor, analysesByGameId, now } =
    await reconcileDrillCards()

  const openingOf = (gameId: string) => {
    const game = gamesById.get(gameId)
    return game && openingLabel(game)
  }
  const filteredDue = dueDrillCards(liveCards, now, filters, openingOf)
  const sessionSize = getSessionSize((await cookies()).get('blitzr-drill-session-size')?.value)
  const sessionCards = selectSessionCards(filteredDue, sessionSize)

  const rawPrompts = sessionCards
    .map((card) => {
      const game = gamesById.get(card.gameId)
      return game ? buildDrillPrompt(card, game, repertoireByColor, analysesByGameId) : null
    })
    .filter((p): p is DrillPrompt => p !== null)

  // Fetched once per unique opponent; buildDrillPrompt() stays pure.
  const opponentUsernames = [...new Set(rawPrompts.map((p) => p.opponentUsername))]
  const avatarEntries = await Promise.all(
    opponentUsernames.map(
      async (username) => [username, await fetchPlayerAvatar(username)] as const,
    ),
  )
  const avatarByUsername = new Map(avatarEntries)
  const prompts = rawPrompts.map((p) => ({
    ...p,
    opponentAvatarUrl: avatarByUsername.get(p.opponentUsername) ?? null,
  }))

  const troubles = troubleCards(filterDrillCards(liveCards, filters, openingOf))
    .map((card) => {
      const game = gamesById.get(card.gameId)
      return game ? buildDrillPrompt(card, game, repertoireByColor, analysesByGameId) : null
    })
    .filter((p): p is DrillPrompt => p !== null)

  return {
    prompts,
    totalCards: liveCards.length,
    dueCount: filteredDue.length,
    troubles,
  }
}

export async function submitDrillAnswer(
  gameId: string,
  sourceType: DrillSourceType,
  ply: number,
  correct: boolean,
): Promise<DrillUndo | null> {
  if (!isValidDrillAnswer(gameId, sourceType, ply, correct)) throw new Error('Invalid drill answer')
  const repo = getRepository()
  const current = await repo.getDrillCard(gameId, sourceType, ply)
  const now = new Date()
  const next = scheduleReview(
    current ?? { intervalDays: 0, easeFactor: 2.5, repetitions: 0 },
    correct,
    now,
  )
  await repo.upsertDrillCard({
    gameId,
    sourceType,
    ply,
    ...next,
    createdAt: current?.createdAt ?? now.toISOString(),
  })
  await repo.recordDrillReviewDay(localDay(now))
  revalidatePath('/drill')
  revalidatePath('/')
  if (!current) return null
  const { dueAt, intervalDays, easeFactor, repetitions, lastReviewedAt } = current
  return {
    previous: { dueAt, intervalDays, easeFactor, repetitions, lastReviewedAt },
    reviewedAt: next.lastReviewedAt!,
  }
}

/**
 * Puts a card's schedule back as it was before `submitDrillAnswer()`, for a misclick. Only while
 * that answer is still the card's latest review; the streak keeps the day.
 */
export async function undoDrillAnswer(
  gameId: string,
  sourceType: DrillSourceType,
  ply: number,
  undo: DrillUndo,
): Promise<ActionResult> {
  const error = getStrings().drill.undoFailed
  if (!isValidDrillAnswer(gameId, sourceType, ply, true) || !isValidDrillUndo(undo)) {
    return { ok: false, error }
  }
  try {
    const repo = getRepository()
    const current = await repo.getDrillCard(gameId, sourceType, ply)
    if (!current || current.lastReviewedAt !== undo.reviewedAt) return { ok: false, error }
    const { dueAt, intervalDays, easeFactor, repetitions, lastReviewedAt } = undo.previous
    await repo.upsertDrillCard({
      ...current,
      dueAt,
      intervalDays,
      easeFactor,
      repetitions,
      lastReviewedAt,
    })
  } catch (err) {
    console.error(err)
    return { ok: false, error }
  }
  revalidatePath('/drill')
  revalidatePath('/')
  return { ok: true }
}

/** Everything the Today page (`/`) shows. Each recent stat covers the last 7 days. */
export async function getTodaySummary(): Promise<{
  hasGames: boolean
  hasUsername: boolean
  drill: {
    due: number
    dueDeviations: number
    dueBlunders: number
    duePunishes: number
    dueMates: number
    sessionSize: number
    streak: number
    /** Last 7 days, oldest first; the last entry is today. */
    week: boolean[]
  }
  unanalyzedGames: number
  accuracy: ReturnType<typeof recentAccuracy>
  results: ReturnType<typeof recentResults>
  weakSpot: { opening: string; blunders: number; drillable: boolean } | null
  worstBlunder: {
    gameId: string
    ply: number
    /** "12." or "12…", from the game's starting position. */
    moveLabel: string
    moveSan: string
    label: string
    why: string
  } | null
  losses: ReturnType<typeof lossReasons>
  lesson: { slug: string; name: string; games: number } | null
  lastGame: {
    id: string
    opponent: string
    result: MyResult
    myColor: MyColor
    /** The final position, for its mini board. */
    fen: string
    accuracy: number | null
    firstBlunderPly: number | null
    firstBlunderMove: number | null
  } | null
  repertoire: ReturnType<typeof repertoireDeviations>
  /** `retry`: the next puzzle is one whose solution was revealed, coming back first. */
  puzzles: { nextId: number | null; retry: boolean; solved: number; total: number }
  lastSyncedAt: string | null
  /** Not yet stale by auto-sync's `isSyncStale()`. */
  syncIsFresh: boolean
}> {
  const repo = getRepository()
  const [
    allGames,
    { liveCards, gamesById, repertoireByColor, analysesByGameId, now },
    unanalyzed,
    games,
    standardStartGames,
    solved,
    revealed,
    reviewDays,
    syncStatus,
  ] = await Promise.all([
    cachedListAllGames(),
    reconcileDrillCards(),
    getUnanalyzedGames(),
    cachedMyStandardGames(),
    cachedStandardStartGames(),
    repo.listSolvedPuzzleIds(),
    repo.listRevealedPuzzleIds(),
    repo.listDrillReviewDays(),
    repo.getArchiveSyncStatus(),
  ])

  const due = dueDrillCards(liveCards, now, undefined, () => undefined)
  const newestFirst = [...games].sort((a, b) => b.endTime - a.endTime)
  const since = now.getTime() / 1000 - 7 * 24 * 60 * 60
  const recentGames = newestFirst.filter((g) => g.endTime >= since)

  const recentStats = buildBlunderStats(recentGames, analysesByGameId)
  const worstOpening = recentStats.byOpening[0]
  const worst = recentStats.worst[0]
  const suggested = suggestLesson(
    standardStartGames.filter((g) => g.endTime >= since),
    OPENING_LESSONS,
  )
  const weakSpot = worstOpening
    ? {
        opening: worstOpening.label,
        blunders: worstOpening.count,
        // The drill's opening filter would come up empty without a card for it.
        drillable: liveCards.some((c) => {
          const game = gamesById.get(c.gameId)
          return game !== undefined && openingLabel(game) === worstOpening.label
        }),
      }
    : null

  const last = newestFirst[0]
  const solvedIds = new Set(solved)
  const problems = allMateProblems()
  // A revealed puzzle never solved comes back first, oldest reveal first. Both tables keep their
  // first timestamp, so revealing an already-solved puzzle doesn't queue it.
  const retryId = revealed.find((id) => !solvedIds.has(id) && getMateProblem(id))
  const syncedAts = syncStatus.map((a) => a.syncedAt).sort()

  return {
    hasGames: allGames.length > 0,
    hasUsername: hasChesscomUsername(),
    drill: {
      due: due.length,
      dueDeviations: due.filter((c) => c.sourceType === 'deviation').length,
      dueBlunders: due.filter((c) => c.sourceType === 'blunder').length,
      duePunishes: due.filter((c) => c.sourceType === 'punish').length,
      dueMates: due.filter((c) => c.sourceType === 'mate').length,
      sessionSize: getSessionSize((await cookies()).get('blitzr-drill-session-size')?.value),
      streak: drillStreak(reviewDays, now),
      week: drillWeek(reviewDays, now),
    },
    unanalyzedGames: unanalyzed.length,
    accuracy: recentAccuracy(buildAccuracyTrend(games, analysesByGameId), now),
    results: recentResults(games, now),
    weakSpot,
    lastGame: last
      ? {
          id: last.id,
          opponent: last.myColor === 'white' ? last.blackUsername : last.whiteUsername,
          result: last.myResult,
          myColor: last.myColor,
          fen:
            last.finalFen ??
            (last.movesSan
              ? buildPositions(last.initialFen, last.movesSan).at(-1)!
              : last.initialFen),
          ...gameReview(last, analysesByGameId.get(last.id)),
        }
      : null,
    // Newest first, like the rest; cachedStandardStartGames() is in insertion order.
    repertoire: repertoireDeviations(
      [...standardStartGames].sort((a, b) => b.endTime - a.endTime),
      repertoireByColor,
    ),
    puzzles: {
      nextId: retryId ?? problems.find((p) => !solvedIds.has(p.id))?.id ?? null,
      retry: retryId !== undefined,
      // Only puzzles in this set: progress can include ones missing from it (local Polgár).
      solved: problems.filter((p) => solvedIds.has(p.id)).length,
      total: problems.length,
    },
    lastSyncedAt: syncedAts.at(-1) ?? null,
    worstBlunder: worst
      ? {
          gameId: worst.gameId,
          ply: worst.ply,
          moveLabel: plyLabel(worst.ply, worst.initialFen),
          moveSan: worst.moveSan,
          label: worst.gameLabel,
          why: worst.reason ? describeBlunderReason(worst.reason) : worst.moveDescription,
        }
      : null,
    losses: lossReasons(recentGames),
    lesson: suggested
      ? {
          slug: suggested.lesson.slug,
          name: suggested.lesson.name[getLocale()],
          games: suggested.games,
        }
      : null,
    syncIsFresh: syncedAts.length > 0 && !isSyncStale(syncedAts, now),
  }
}

export async function getSolvedPuzzleIds(): Promise<number[]> {
  return getRepository().listSolvedPuzzleIds()
}

export async function markPuzzleSolved(puzzleId: number): Promise<void> {
  if (!Number.isInteger(puzzleId) || !getMateProblem(puzzleId)) throw new Error('Invalid puzzle')
  await getRepository().markPuzzleSolved(puzzleId)
  revalidatePath('/puzzles')
  revalidatePath('/')
}

export async function markPuzzleRevealed(puzzleId: number): Promise<void> {
  if (!Number.isInteger(puzzleId) || !getMateProblem(puzzleId)) throw new Error('Invalid puzzle')
  await getRepository().markPuzzleRevealed(puzzleId)
  revalidatePath('/')
}
