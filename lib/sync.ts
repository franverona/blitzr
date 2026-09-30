import { fetchArchiveMonth, fetchArchives } from './chesscom/client'
import { normalizeGame } from './chesscom/normalize'
import { getChesscomUsername } from './config'
import { getRepository } from './db'
import type { SyncResult } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The oldest archive month that may still gain games, as "YYYY-MM". Months
 * from this one on are always re-fetched and never marked complete. Using
 * the local calendar month was wrong: ahead of UTC (e.g. Spain, UTC+2), a
 * sync just after local midnight on the 1st marked the previous month
 * complete while it was still that month for Chess.com, and games finished
 * in the gap were never fetched. Looking one day back in UTC keeps a month
 * open until it has ended everywhere, whichever timezone Chess.com uses to
 * group its archives.
 */
export function oldestOpenArchiveYm(now: Date = new Date()): string {
  const dayAgo = new Date(now.getTime() - DAY_MS)
  return `${dayAgo.getUTCFullYear()}-${String(dayAgo.getUTCMonth() + 1).padStart(2, '0')}`
}

function archiveYmFromUrl(url: string): string | null {
  const match = url.match(/\/(\d{4})\/(\d{2})$/)
  return match ? `${match[1]}-${match[2]}` : null
}

/**
 * Fetches every monthly archive not already marked complete, plus any month
 * that may still gain new games (always re-fetched — see oldestOpenArchiveYm).
 * Archives are fetched serially — Chess.com throttles parallel requests.
 */
export async function syncAllArchives(): Promise<SyncResult> {
  const username = getChesscomUsername()
  const repo = getRepository()

  const archiveUrls = await fetchArchives(username)
  const syncedStatus = new Map(
    (await repo.getArchiveSyncStatus()).map((s) => [s.archiveYm, s.status]),
  )
  const oldestOpen = oldestOpenArchiveYm()

  let archivesSynced = 0
  let gamesUpserted = 0

  for (const url of archiveUrls) {
    const archiveYm = archiveYmFromUrl(url)
    if (!archiveYm) continue

    // "YYYY-MM" strings sort chronologically.
    const isOpen = archiveYm >= oldestOpen
    if (syncedStatus.get(archiveYm) === 'complete' && !isOpen) continue

    const [year, month] = archiveYm.split('-')
    const rawGames = await fetchArchiveMonth(username, year, month)
    const games = rawGames.map((raw) => normalizeGame(raw, username, archiveYm))

    const upserted = await repo.upsertGames(games)
    await repo.markArchiveSynced(archiveYm, isOpen ? 'partial' : 'complete', games.length)

    archivesSynced++
    gamesUpserted += upserted
  }

  return { archivesSynced, gamesUpserted }
}
