import { fetchArchiveMonth, fetchArchives } from './chesscom/client'
import { normalizeGame } from './chesscom/normalize'
import { siteUsername } from './config'
import { getRepository } from './db'
import { fetchLichessCreatedAt, fetchLichessGames } from './lichess/client'
import { isOngoing, normalizeLichessGame } from './lichess/normalize'
import { findDuplicateGame } from './manualGame'
import type { Game, GameSite } from './types'

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

/** Lichess months are keyed `lichess:YYYY-MM` in `sync_state` and `archive_ym`; Chess.com's stay
 *  bare, as they were before Lichess. */
const LICHESS_PREFIX = 'lichess:'

function archiveYmFromUrl(url: string): string | null {
  const match = url.match(/\/(\d{4})\/(\d{2})$/)
  return match ? `${match[1]}-${match[2]}` : null
}

function isPending(key: string, syncedStatus: Map<string, string>, oldestOpen: string): boolean {
  return syncedStatus.get(key) !== 'complete' || key.replace(LICHESS_PREFIX, '') >= oldestOpen
}

/**
 * Archive months to fetch, oldest first per site (Chess.com's, then Lichess's): every one not
 * marked complete, plus any still-open month. The client syncs them one call at a time so it can
 * show progress. Only sites with a username set are synced.
 */
export async function listPendingArchives(): Promise<string[]> {
  const syncedStatus = new Map(
    (await getRepository().getArchiveSyncStatus()).map((s) => [s.archiveYm, s.status]),
  )
  const oldestOpen = oldestOpenArchiveYm()
  const chesscom = siteUsername('chesscom')
  const lichess = siteUsername('lichess')
  return [
    ...(chesscom ? pendingArchiveYms(await fetchArchives(chesscom), syncedStatus, oldestOpen) : []),
    ...(lichess
      ? lichessArchiveYms(await fetchLichessCreatedAt(lichess)).filter((key) =>
          isPending(key, syncedStatus, oldestOpen),
        )
      : []),
  ]
}

export function pendingArchiveYms(
  archiveUrls: string[],
  syncedStatus: Map<string, string>,
  oldestOpen: string,
): string[] {
  return archiveUrls
    .map(archiveYmFromUrl)
    .filter((ym): ym is string => ym !== null)
    .filter((ym) => isPending(ym, syncedStatus, oldestOpen))
}

/** Every `lichess:YYYY-MM` from the account's creation (ms) to `now`, in UTC like Lichess. */
export function lichessArchiveYms(createdAt: number, now: Date = new Date()): string[] {
  const keys: string[] = []
  // NaN would never reach the break below.
  if (!Number.isFinite(createdAt)) return keys
  const cursor = new Date(createdAt)
  for (let y = cursor.getUTCFullYear(), m = cursor.getUTCMonth(); ; m++) {
    if (m === 12) {
      y++
      m = 0
    }
    if (y > now.getUTCFullYear() || (y === now.getUTCFullYear() && m > now.getUTCMonth())) break
    keys.push(`${LICHESS_PREFIX}${y}-${String(m + 1).padStart(2, '0')}`)
  }
  return keys
}

/** A `listPendingArchives()` key, as the client sends it back. */
export function isArchiveKey(key: string): boolean {
  return /^(lichess:)?\d{4}-\d{2}$/.test(key)
}

// A month listed before its username was removed from the env.
function requireUsername(site: GameSite): string {
  const username = siteUsername(site)
  if (!username) throw new Error(`No ${site} username is set`)
  return username
}

/** Fetches and stores one archive month of either site. Returns how many games were new. */
export async function syncArchive(key: string): Promise<number> {
  const repo = getRepository()
  const lichess = key.startsWith(LICHESS_PREFIX)
  const archiveYm = key.replace(LICHESS_PREFIX, '')
  // "YYYY-MM" strings sort chronologically.
  let isOpen = archiveYm >= oldestOpenArchiveYm()
  const [year, month] = archiveYm.split('-')

  let games: Game[]
  let fetched: number
  if (lichess) {
    const username = requireUsername('lichess')
    // Lichess filters by when a game started, so a month stays open while one of its
    // (correspondence) games is still being played, or that game would never be fetched.
    const since = Date.UTC(Number(year), Number(month) - 1, 1)
    const until = Date.UTC(Number(year), Number(month), 1) - 1
    const raw = await fetchLichessGames(username, since, until)
    if (raw.some(isOngoing)) isOpen = true
    games = raw
      .map((g) => normalizeLichessGame(g, username, key))
      .filter((g): g is Game => g !== null)
    fetched = raw.length
  } else {
    const username = requireUsername('chesscom')
    const rawGames = await fetchArchiveMonth(username, year, month)
    games = rawGames.map((raw) => normalizeGame(raw, username, archiveYm))
    fetched = rawGames.length
  }

  // A game already pasted in keeps that copy, with its analysis and drill cards.
  const manual = await repo.listManualGames()
  const fresh = manual.length ? games.filter((g) => !findDuplicateGame(g, manual)) : games

  const upserted = await repo.upsertGames(fresh)
  await repo.markArchiveSynced(key, isOpen ? 'partial' : 'complete', fetched)
  return upserted
}
