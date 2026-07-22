const BASE_URL = 'https://api.chess.com/pub'

// Chess.com throttles requests with no (or a generic) User-Agent — identify
// the app and give them a way to reach us per their Published-Data API terms.
const USER_AGENT =
  'Blitzr/0.1 (personal chess repertoire trainer; https://github.com/franverona/blitzr)'

export interface ChesscomPlayerResult {
  rating?: number
  result: string
  username: string
  uuid: string
}

export interface ChesscomGame {
  url: string
  pgn: string
  time_control: string
  end_time: number
  rated: boolean
  uuid: string
  initial_setup: string
  fen: string
  time_class: string
  rules: string
  white: ChesscomPlayerResult
  black: ChesscomPlayerResult
  eco?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })

  if (res.status === 429) {
    if (attempt > 5) {
      throw new Error(`Chess.com API rate-limited too many times, giving up: ${url}`)
    }
    const retryAfterSeconds = Number(res.headers.get('retry-after')) || 5
    await sleep(retryAfterSeconds * 1000)
    return getJson<T>(url, attempt + 1)
  }

  if (!res.ok) {
    throw new Error(`Chess.com API request failed (${res.status} ${res.statusText}): ${url}`)
  }

  return res.json() as Promise<T>
}

/** Returns the list of monthly archive URLs for a player, oldest first. */
export async function fetchArchives(username: string): Promise<string[]> {
  const data = await getJson<{ archives: string[] }>(
    `${BASE_URL}/player/${encodeURIComponent(username)}/games/archives`,
  )
  return data.archives
}

export async function fetchArchiveMonth(
  username: string,
  year: string,
  month: string,
): Promise<ChesscomGame[]> {
  const data = await getJson<{ games: ChesscomGame[] }>(
    `${BASE_URL}/player/${encodeURIComponent(username)}/games/${year}/${month}`,
  )
  return data.games
}

/** Purely decorative, so any failure (unknown user, bot with no public
 *  profile, rate limit) just means no avatar rather than a broken page. */
export async function fetchPlayerAvatar(username: string): Promise<string | null> {
  try {
    const data = await getJson<{ avatar?: string }>(
      `${BASE_URL}/player/${encodeURIComponent(username)}`,
    )
    return data.avatar ?? null
  } catch {
    return null
  }
}
