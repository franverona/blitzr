import { fetchArchiveMonth, fetchArchives } from './chesscom/client'
import { normalizeGame } from './chesscom/normalize'
import { getChesscomUsername } from './config'
import { getRepository } from './db'
import { findDuplicateGame } from './manualGame'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_AUTO_SYNC_MINUTES = 60

/** `BLITZR_AUTO_SYNC_MINUTES` (default 60); 0 turns auto-sync off. Anything invalid is the default. */
export function autoSyncMinutes(): number {
  const raw = process.env.BLITZR_AUTO_SYNC_MINUTES?.trim()
  const minutes = raw ? Number(raw) : DEFAULT_AUTO_SYNC_MINUTES
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_AUTO_SYNC_MINUTES
}

/**
 * Opening the app syncs once the last sync is over `autoSyncMinutes()` old, but never before a
 * first manual one. With auto-sync off, Today's badge still goes stale after the default hour.
 */
export function isSyncStale(
  syncedAts: string[],
  now: Date = new Date(),
  minutes: number = autoSyncMinutes() || DEFAULT_AUTO_SYNC_MINUTES,
): boolean {
  if (syncedAts.length === 0) return false
  return now.getTime() - Math.max(...syncedAts.map(Date.parse)) > minutes * 60_000
}

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
 * Archive months to fetch, oldest first: every one not marked complete, plus
 * any still-open month. The client syncs them one call at a time so it can
 * show progress.
 */
export async function listPendingArchives(): Promise<string[]> {
  const archiveUrls = await fetchArchives(getChesscomUsername())
  const syncedStatus = new Map(
    (await getRepository().getArchiveSyncStatus()).map((s) => [s.archiveYm, s.status]),
  )
  return pendingArchiveYms(archiveUrls, syncedStatus, oldestOpenArchiveYm())
}

export function pendingArchiveYms(
  archiveUrls: string[],
  syncedStatus: Map<string, string>,
  oldestOpen: string,
): string[] {
  return archiveUrls
    .map(archiveYmFromUrl)
    .filter((ym): ym is string => ym !== null)
    .filter((ym) => syncedStatus.get(ym) !== 'complete' || ym >= oldestOpen)
}

/** Fetches and stores one archive month. Returns how many games were new. */
export async function syncArchive(archiveYm: string): Promise<number> {
  const username = getChesscomUsername()
  const repo = getRepository()
  // "YYYY-MM" strings sort chronologically.
  const isOpen = archiveYm >= oldestOpenArchiveYm()

  const [year, month] = archiveYm.split('-')
  const rawGames = await fetchArchiveMonth(username, year, month)
  const games = rawGames.map((raw) => normalizeGame(raw, username, archiveYm))
  // A game already pasted in keeps that copy, with its analysis and drill cards.
  const manual = await repo.listManualGames()
  const fresh = manual.length ? games.filter((g) => !findDuplicateGame(g, manual)) : games

  const upserted = await repo.upsertGames(fresh)
  await repo.markArchiveSynced(archiveYm, isOpen ? 'partial' : 'complete', games.length)
  return upserted
}
