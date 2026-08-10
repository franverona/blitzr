import { Chess } from 'chess.js'
import type { ChesscomGame } from './client'
import type { Game, MyColor, MyResult } from '../types'

// Chess.com's per-player "result" string is one of ~15 values. Anything that
// isn't an outright win and isn't one of these known draw outcomes counts as
// a loss for that side (checkmated, resigned, timeout, abandoned, etc).
const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
])

export function normalizeResult(raw: string): MyResult {
  if (raw === 'win') return 'win'
  if (DRAW_RESULTS.has(raw)) return 'draw'
  return 'loss'
}

// Chess.com's eco URL slug is already space-separated-with-dashes and reads
// fine decoded as-is (e.g. "Closed-Sicilian-Defense-Grand-Prix-Attack-3...g6"
// -> "Closed Sicilian Defense Grand Prix Attack 3...g6"). We additionally
// split it into "family name: move list" at the first move-number token,
// purely as a display nicety.
export function ecoNameFromUrl(url: string): string {
  const slug = url.split('/').filter(Boolean).pop() ?? url
  const decoded = decodeURIComponent(slug).replace(/-/g, ' ')
  const words = decoded.split(' ')
  const moveIndex = words.findIndex((word) => /^\d/.test(word))
  if (moveIndex <= 0) return decoded
  return `${words.slice(0, moveIndex).join(' ')}: ${words.slice(moveIndex).join(' ')}`
}

// Extracted independently of chess.js's PGN parser so headers (incl. ECO) are
// still available even for games whose movetext chess.js can't validate.
export function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const match of pgn.matchAll(/^\[(\w+)\s+"(.*)"\]$/gm)) {
    headers[match[1]] = match[2]
  }
  return headers
}

// "Play vs Bot" is the one Chess.com bot-opponent mode whose PGN
// White/Black header holds a bot personality's bare *display* name (e.g.
// "Hans") rather than its real backing account — a name that can
// coincidentally collide with an unrelated real user's own username
// (confirmed: chess.com has a real registered user literally named
// "hans"). "Play vs Coach" is a bot-opponent mode too (see CLAUDE.md's
// "Known Chess.com API quirks" for its other, unrelated Link-header quirk),
// but is deliberately excluded here: its header already *is* the coach's
// real dedicated account name (e.g. "Coach-DrWolf" resolves directly and
// correctly via the normal player-lookup path), so it needs no special
// handling. "Play Bots" personality games aren't included either: they
// never reach the public API at all, so there's no real PGN sample to
// confirm their Event string against.
const BARE_BOT_NAME_EVENTS = new Set(['Play vs Bot'])

/** True when a game's PGN Event means one side's "username" is a bare bot
 *  personality display name rather than a real, directly-resolvable
 *  account — see `fetchBotAvatar()` (lib/chesscom/client.ts) for how
 *  callers should look up that side's avatar instead of trusting a direct
 *  match. */
export function isBareBotNameEvent(event: string | undefined): boolean {
  return event !== undefined && BARE_BOT_NAME_EVENTS.has(event)
}

export function normalizeGame(raw: ChesscomGame, username: string, archiveYm: string): Game {
  const headers = parsePgnHeaders(raw.pgn)
  const isWhite = raw.white.username.toLowerCase() === username.toLowerCase()
  const myColor: MyColor = isWhite ? 'white' : 'black'
  const myResult = normalizeResult(isWhite ? raw.white.result : raw.black.result)

  let movesSan: string[] | null = null
  let finalFen: string | null = null
  try {
    const chess = new Chess()
    chess.loadPgn(raw.pgn)
    movesSan = chess.history()
    finalFen = chess.fen()
  } catch {
    // Some variants (e.g. bughouse's piece-drop notation) aren't valid
    // standard PGN — keep the raw PGN for reference and skip the derived
    // fields rather than failing the whole sync over one game.
  }

  const ecoUrl = raw.eco ?? headers.ECOUrl ?? null

  return {
    id: raw.uuid,
    url: raw.url,
    pgn: raw.pgn,
    movesSan,
    initialFen: raw.initial_setup,
    finalFen,
    timeControl: raw.time_control,
    timeClass: raw.time_class,
    rules: raw.rules,
    rated: raw.rated,
    endTime: raw.end_time,
    whiteUsername: raw.white.username,
    whiteRating: raw.white.rating ?? null,
    whiteResult: raw.white.result,
    blackUsername: raw.black.username,
    blackRating: raw.black.rating ?? null,
    blackResult: raw.black.result,
    myColor,
    myResult,
    ecoCode: headers.ECO ?? null,
    ecoName: ecoUrl ? ecoNameFromUrl(ecoUrl) : null,
    ecoUrl,
    archiveYm,
    createdAt: new Date().toISOString(),
  }
}
