import { fetchArchiveMonth, fetchArchives } from './chesscom/client'
import { normalizeGame } from './chesscom/normalize'
import { getChesscomUsername } from './config'
import { getRepository } from './db'
import type { SyncResult } from './types'

function currentArchiveYm(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function archiveYmFromUrl(url: string): string | null {
  const match = url.match(/\/(\d{4})\/(\d{2})$/)
  return match ? `${match[1]}-${match[2]}` : null
}

/**
 * Fetches every monthly archive not already marked complete, plus the
 * current month (always re-fetched, since it may still gain new games).
 * Archives are fetched serially — Chess.com throttles parallel requests.
 */
export async function syncAllArchives(): Promise<SyncResult> {
  const username = getChesscomUsername()
  const repo = getRepository()

  const archiveUrls = await fetchArchives(username)
  const syncedStatus = new Map(
    (await repo.getArchiveSyncStatus()).map((s) => [s.archiveYm, s.status]),
  )
  const thisMonth = currentArchiveYm()

  let archivesSynced = 0
  let gamesUpserted = 0

  for (const url of archiveUrls) {
    const archiveYm = archiveYmFromUrl(url)
    if (!archiveYm) continue

    const isCurrentMonth = archiveYm === thisMonth
    if (syncedStatus.get(archiveYm) === 'complete' && !isCurrentMonth) continue

    const [year, month] = archiveYm.split('-')
    const rawGames = await fetchArchiveMonth(username, year, month)
    const games = rawGames.map((raw) => normalizeGame(raw, username, archiveYm))

    const upserted = await repo.upsertGames(games)
    await repo.markArchiveSynced(archiveYm, isCurrentMonth ? 'partial' : 'complete', games.length)

    archivesSynced++
    gamesUpserted += upserted
  }

  return { archivesSynced, gamesUpserted }
}
