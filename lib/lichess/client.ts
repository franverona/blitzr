const BASE_URL = 'https://lichess.org/api'

const USER_AGENT =
  'Blitzr/0.1 (personal chess repertoire trainer; https://github.com/franverona/blitzr)'

/** The fields of a game export (`pgnInJson`) that the PGN doesn't carry, or carries less exactly. */
export interface LichessGame {
  id: string
  rated: boolean
  variant: string
  speed: string
  createdAt: number
  lastMoveAt: number
  /** "started" while ongoing; "mate", "resign", "outoftime", "timeout", "draw", "aborted"… */
  status: string
  winner?: 'white' | 'black'
  clock?: { initial: number; increment: number }
  daysPerTurn?: number
  pgn: string
}

/** Carries the HTTP status so callers can show a localized reason. */
export class LichessApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// The export streams about 20 games a second without a token, so a busy month takes a while.
const REQUEST_TIMEOUT_MS = 120_000
// Lichess asks clients to wait a full minute after a 429.
const RATE_LIMIT_WAIT_MS = 60_000

async function get(url: string, accept: string, attempt = 1): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (res.status === 429) {
    if (attempt > 2) {
      throw new LichessApiError(`Lichess API rate-limited too many times, giving up: ${url}`, 429)
    }
    await sleep(RATE_LIMIT_WAIT_MS)
    return get(url, accept, attempt + 1)
  }
  if (!res.ok) {
    throw new LichessApiError(
      `Lichess API request failed (${res.status} ${res.statusText}): ${url}`,
      res.status,
    )
  }
  return res.text()
}

/** When the account was created (ms), the first month a sync needs. */
export async function fetchLichessCreatedAt(username: string): Promise<number> {
  const body = await get(`${BASE_URL}/user/${encodeURIComponent(username)}`, 'application/json')
  return (JSON.parse(body) as { createdAt: number }).createdAt
}

// At ~20 games a second, a page takes under a minute, well inside REQUEST_TIMEOUT_MS.
const PAGE_SIZE = 1000

/** Games created in [since, until] (ms), ongoing ones included so the caller can tell. */
export async function fetchLichessGames(
  username: string,
  since: number,
  until: number,
): Promise<LichessGame[]> {
  const games: LichessGame[] = []
  // Oldest first, a page at a time: one request for a busy month would outlast the timeout.
  for (let from = since; ;) {
    const params = new URLSearchParams({
      since: String(from),
      until: String(until),
      max: String(PAGE_SIZE),
      sort: 'dateAsc',
      pgnInJson: 'true',
      ongoing: 'true',
      clocks: 'false',
      evals: 'false',
    })
    const body = await get(
      `${BASE_URL}/games/user/${encodeURIComponent(username)}?${params}`,
      'application/x-ndjson',
    )
    const page = body
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as LichessGame)
    games.push(...page)
    if (page.length < PAGE_SIZE) return games
    from = page[page.length - 1].createdAt + 1
  }
}
