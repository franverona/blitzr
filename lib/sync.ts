import { fetchArchiveMonth, fetchArchives } from './chesscom/client'
import { normalizeGame } from './chesscom/normalize'
import { getChesscomUsername } from './config'
import { getRepository } from './db'
import type { SyncResult } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The oldest archive month ("YYYY-MM") that may still gain games. Looks one
 * day back in UTC so a month stays open until it has ended in every
 * timezone; using the local month closed it too early ahead of UTC.
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
 * Fetches every archive not marked complete, plus any still-open month.
 * Serial, since Chess.com throttles parallel requests.
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
