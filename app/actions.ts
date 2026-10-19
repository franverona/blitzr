'use server'

import { revalidatePath } from 'next/cache'
import { cache } from 'react'
import { buildAccuracyTrend } from '@/lib/accuracyTrend'
import { buildBlunderStats } from '@/lib/blunders'
import { ChesscomApiError, fetchPlayerAvatar } from '@/lib/chesscom/client'
import { endOfDaySeconds, formatDate, startOfDaySeconds } from '@/lib/dates'
import { getChesscomUsername } from '@/lib/config'
import { getRepository } from '@/lib/db'
import { getStrings } from '@/lib/i18n/strings'
import type { GameRepository } from '@/lib/db/types'
import {
  buildDrillPrompt,
  findBlunderCandidates,
  findDeviationCandidates,
  newCardSchedule,
  scheduleReview,
  selectSessionCards,
} from '@/lib/drill'
import type { DrillCandidate } from '@/lib/drill'
import { parseManualGame, type ManualGameSide } from '@/lib/manualGame'
import { summarizeMoveQuality } from '@/lib/moveQuality'
import { buildOpeningFamilies, ecoFamilyLabel, unknownOpeningLabel } from '@/lib/openings'
import { countGamesReachingLine } from '@/lib/openingTheory'
import { isStandardChess, startsFromStandardPosition } from '@/lib/positions'
import { listPendingArchives, syncArchive } from '@/lib/sync'
import type {
  ArchiveSyncStatus,
  BlunderStats,
  DrillCard,
  DrillPrompt,
  DrillSourceType,
  Game,
  GameAccuracy,
  GameAnalysis,
  LessonGameStats,
  OpeningFamily,
  PositionEval,
  RepertoireColor,
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

function filterByDateRange(games: Game[], filters?: { from?: string; to?: string }): Game[] {
  if (!filters?.from && !filters?.to) return games
  const fromSeconds = filters.from ? startOfDaySeconds(filters.from) : undefined
  const toSeconds = filters.to ? endOfDaySeconds(filters.to) : undefined
  return games.filter(
    (g) =>
      (fromSeconds === undefined || g.endTime >= fromSeconds) &&
      (toSeconds === undefined || g.endTime <= toSeconds),
  )
}

export async function listGames(
  params: Parameters<GameRepository['listGames']>[0] = {},
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

function hasUsername(): boolean {
  try {
    getChesscomUsername()
    return true
  } catch {
    return false
  }
}

/** Step 1 of a sync; the client then calls syncArchiveMonth() per month to
 *  show progress. Errors are returned, not thrown, as in addManualGame(). */
export async function listArchivesToSync(): Promise<{ ok: true; archives: string[] } | SyncError> {
  if (!hasUsername()) return { ok: false, error: getStrings().sync.noUsername }
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
    revalidatePath('/')
    revalidatePath('/openings')
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
  let game: Game
  try {
    game = parseManualGame(pgn, getChesscomUsername(), side)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '' }
  }
  await getRepository().upsertGames([game])
  revalidatePath('/')
  return { ok: true, gameId: game.id }
}

/** Synced games aren't deletable: the next sync would bring them back. */
export async function deleteManualGame(id: string): Promise<void> {
  const repo = getRepository()
  const game = await repo.getGame(id)
  if (game?.archiveYm !== 'manual') return
  await repo.deleteGame(id)
  for (const path of ['/', '/openings', '/blunders', '/drill']) revalidatePath(path)
}

export async function listRepertoire(color: RepertoireColor): Promise<RepertoireNode[]> {
  return getRepository().listRepertoireNodes(color)
}

export async function addRepertoireMove(node: RepertoireNode): Promise<void> {
  await getRepository().addRepertoireNode(node)
  revalidatePath('/repertoire')
}

export async function deleteRepertoireMove(id: string): Promise<void> {
  await getRepository().deleteRepertoireNode(id)
  revalidatePath('/repertoire')
}

export async function getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined> {
  return getRepository().getGameAnalysis(gameId)
}

export async function saveGameAnalysis(
  gameId: string,
  evals: PositionEval[],
  movetimeMs: number,
): Promise<void> {
  await getRepository().saveGameAnalysis({
    gameId,
    evals,
    analyzedAt: new Date().toISOString(),
    movetimeMs,
  })
  revalidatePath(`/games/${gameId}`)
  revalidatePath('/blunders')
  revalidatePath('/')
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

function cardKey(c: { gameId: string; sourceType: DrillSourceType; ply: number }): string {
  return `${c.gameId}:${c.sourceType}:${c.ply}`
}

function openingLabel(game: Game): string {
  return game.ecoName ? ecoFamilyLabel(game.ecoName) : unknownOpeningLabel()
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
  availableOpenings: string[]
}> {
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
    ...findDeviationCandidates(standardStartGames, repertoireByColor),
    ...findBlunderCandidates(games, analysesByGameId),
  ]
  const candidateKeys = new Set(candidates.map(cardKey))
  const existingByKey = new Map(existingCards.map((c) => [cardKey(c), c]))

  const stale = existingCards.filter((c) => !candidateKeys.has(cardKey(c)))
  const now = new Date()
  const newCards: DrillCard[] = candidates
    .filter((c) => !existingByKey.has(cardKey(c)))
    .map((c) => ({ ...c, ...newCardSchedule(now), createdAt: now.toISOString() }))

  await Promise.all([
    ...(stale.length > 0 ? [repo.deleteDrillCards(stale)] : []),
    ...newCards.map((c) => repo.upsertDrillCard(c)),
  ])

  const liveCards = [...existingCards.filter((c) => candidateKeys.has(cardKey(c))), ...newCards]
  const dueCardsAll = liveCards.filter((c) => c.dueAt <= now.toISOString())

  const matchesFilters = (card: DrillCard) => {
    if (filters?.sourceType && card.sourceType !== filters.sourceType) return false
    if (filters?.opening) {
      const game = gamesById.get(card.gameId)
      if (!game || openingLabel(game) !== filters.opening) return false
    }
    return true
  }
  const filteredDue = dueCardsAll.filter(matchesFilters)
  const sessionCards = selectSessionCards(filteredDue)

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

  const availableOpenings = [
    ...new Set(
      liveCards
        .map((c) => gamesById.get(c.gameId))
        .filter((g): g is Game => g !== undefined)
        .map(openingLabel),
    ),
  ].sort()

  return {
    prompts,
    totalCards: liveCards.length,
    dueCount: filteredDue.length,
    availableOpenings,
  }
}

export async function submitDrillAnswer(
  gameId: string,
  sourceType: DrillSourceType,
  ply: number,
  correct: boolean,
): Promise<void> {
  const repo = getRepository()
  const cards = await repo.listDrillCards()
  const current = cards.find(
    (c) => c.gameId === gameId && c.sourceType === sourceType && c.ply === ply,
  )
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
  revalidatePath('/drill')
}

export async function getSolvedPuzzleIds(): Promise<number[]> {
  return getRepository().listSolvedPuzzleIds()
}

export async function markPuzzleSolved(puzzleId: number): Promise<void> {
  await getRepository().markPuzzleSolved(puzzleId)
  revalidatePath('/puzzles')
}
