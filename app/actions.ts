'use server'

import { revalidatePath } from 'next/cache'
import { buildBlunderStats } from '@/lib/blunders'
import { formatDate } from '@/lib/dates'
import { getRepository } from '@/lib/db'
import {
  buildDrillPrompt,
  findBlunderCandidates,
  findDeviationCandidates,
  newCardSchedule,
  scheduleReview,
} from '@/lib/drill'
import type { DrillCandidate } from '@/lib/drill'
import { buildOpeningFamilies } from '@/lib/openings'
import { syncAllArchives } from '@/lib/sync'
import type {
  ArchiveSyncStatus,
  BlunderStats,
  DrillCard,
  DrillPrompt,
  DrillSourceType,
  Game,
  GameAnalysis,
  OpeningFamily,
  PositionEval,
  RepertoireColor,
  RepertoireNode,
  SyncResult,
  UnanalyzedGame,
} from '@/lib/types'

export async function listGames(
  params: { limit?: number; offset?: number } = {},
): Promise<{ games: Game[]; total: number }> {
  return getRepository().listGames(params)
}

export async function getGame(id: string): Promise<Game | undefined> {
  return getRepository().getGame(id)
}

export async function listOpenings(): Promise<OpeningFamily[]> {
  const games = await getRepository().listAllGames()
  return buildOpeningFamilies(games)
}

export async function getBlunderStats(): Promise<BlunderStats> {
  const repo = getRepository()
  const [games, analyses] = await Promise.all([repo.listAllGames(), repo.listAllGameAnalyses()])
  const analysesByGameId = new Map(analyses.map((a) => [a.gameId, a]))
  return buildBlunderStats(games, analysesByGameId)
}

export async function getArchiveSyncStatus(): Promise<ArchiveSyncStatus[]> {
  return getRepository().getArchiveSyncStatus()
}

export async function syncGames(): Promise<SyncResult> {
  const result = await syncAllArchives()
  revalidatePath('/')
  revalidatePath('/openings')
  return result
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

export async function saveGameAnalysis(gameId: string, evals: PositionEval[]): Promise<void> {
  await getRepository().saveGameAnalysis({ gameId, evals, analyzedAt: new Date().toISOString() })
  revalidatePath(`/games/${gameId}`)
  revalidatePath('/blunders')
}

/** Every synced game with no saved analysis yet, for the bulk "Analyze all"
 *  action on the Games page — games whose moves couldn't be parsed have no
 *  positions to analyze and are skipped, same as the per-game Analyze
 *  button's visibility. */
export async function getUnanalyzedGames(): Promise<UnanalyzedGame[]> {
  const repo = getRepository()
  const [games, analyses] = await Promise.all([repo.listAllGames(), repo.listAllGameAnalyses()])
  const analyzedIds = new Set(analyses.map((a) => a.gameId))

  return games
    .filter((g) => g.movesSan && !analyzedIds.has(g.id))
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

function cardKey(c: { gameId: string; sourceType: DrillSourceType; ply: number }): string {
  return `${c.gameId}:${c.sourceType}:${c.ply}`
}

/**
 * Syncs the drill deck against current game/repertoire/analysis data (new
 * candidates get a fresh card, cards that no longer match anything — e.g.
 * the repertoire changed — get pruned) and returns every prompt that's
 * currently due. Runs on every /drill load rather than behind a separate
 * "sync" action — it's a cheap local recompute, same as how the openings
 * aggregation just runs fresh on every page load.
 */
export async function getDrillDeck(): Promise<{ prompts: DrillPrompt[]; totalCards: number }> {
  const repo = getRepository()
  const [games, whiteNodes, blackNodes, analyses, existingCards] = await Promise.all([
    repo.listAllGames(),
    repo.listRepertoireNodes('white'),
    repo.listRepertoireNodes('black'),
    repo.listAllGameAnalyses(),
    repo.listDrillCards(),
  ])

  const gamesById = new Map(games.map((g) => [g.id, g]))
  const repertoireByColor = new Map<RepertoireColor, RepertoireNode[]>([
    ['white', whiteNodes],
    ['black', blackNodes],
  ])
  const analysesByGameId = new Map(analyses.map((a) => [a.gameId, a]))

  const candidates: DrillCandidate[] = [
    ...findDeviationCandidates(games, repertoireByColor),
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
  const dueCards = liveCards.filter((c) => c.dueAt <= now.toISOString())

  const prompts = dueCards
    .map((card) => {
      const game = gamesById.get(card.gameId)
      return game ? buildDrillPrompt(card, game, repertoireByColor, analysesByGameId) : null
    })
    .filter((p): p is DrillPrompt => p !== null)

  return { prompts, totalCards: liveCards.length }
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
