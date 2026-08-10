import { Chess } from 'chess.js'
import { ecoNameFromUrl, parsePgnHeaders } from './chesscom/normalize'
import type { Game, MyColor, MyResult } from './types'

// Games that never reach the synced `games` table (Chess.com's public API
// doesn't expose "Play Bots" personality games at all — see CLAUDE.md's
// "Known Chess.com API quirks") can still be analyzed by pasting their PGN
// directly. Unlike `normalizeGame()` (lib/chesscom/normalize.ts), there's no
// `ChesscomGame` API object to read structured fields from — everything
// comes from the PGN's own headers, with plain fallbacks where a header is
// missing. And unlike the sync path, which tolerates unparseable movetext
// (a synced archive shouldn't fail wholesale over one bad game), this throws
// on it — a manually-added game exists specifically to be analyzed, so
// silently saving one with no moves isn't useful; better to reject at input
// time and let the UI surface the error.

function myResultFromPgnResult(pgnResult: string | undefined, color: MyColor): MyResult {
  if (pgnResult === '1/2-1/2') return 'draw'
  const whiteWon = pgnResult === '1-0'
  return whiteWon === (color === 'white') ? 'win' : 'loss'
}

// Chess.com's Date/EndDate headers are "YYYY.MM.DD", which Date.parse()
// doesn't accept directly.
function endTimeFromPgnDate(headers: Record<string, string>): number {
  const raw = headers.EndDate ?? headers.Date
  const parsed = raw ? Date.parse(raw.replace(/\./g, '-')) : NaN
  return Number.isNaN(parsed) ? Date.now() : Math.floor(parsed / 1000)
}

function ratingFromHeader(value: string | undefined): number | null {
  const rating = Number.parseInt(value ?? '', 10)
  return Number.isNaN(rating) ? null : rating
}

export function parseManualGame(pgn: string, username: string): Game {
  const headers = parsePgnHeaders(pgn)
  if (!headers.White || !headers.Black) {
    throw new Error('PGN is missing White/Black player headers.')
  }

  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
  } catch {
    throw new Error('Could not parse this PGN — check the move text is valid.')
  }
  const movesSan = chess.history()
  const finalFen = chess.fen()

  const isBlack = headers.Black.toLowerCase() === username.toLowerCase()
  // ponytail: a pasted PGN isn't guaranteed to feature the account owner at
  // all (e.g. a friend's game); default to White rather than throw, same
  // "best-effort, never fail the whole add over it" spirit as the rest of
  // this function's fallbacks.
  const myColor: MyColor = isBlack ? 'black' : 'white'
  const myResult = myResultFromPgnResult(headers.Result, myColor)

  const ecoUrl = headers.ECOUrl ?? null

  return {
    id: crypto.randomUUID(),
    url: headers.Link ?? '',
    pgn,
    movesSan,
    initialFen: headers.FEN ?? new Chess().fen(),
    finalFen,
    timeControl: headers.TimeControl ?? '',
    timeClass: 'unknown',
    rules: 'chess',
    rated: false,
    endTime: endTimeFromPgnDate(headers),
    whiteUsername: headers.White,
    whiteRating: ratingFromHeader(headers.WhiteElo),
    whiteResult: myResultFromPgnResult(headers.Result, 'white'),
    blackUsername: headers.Black,
    blackRating: ratingFromHeader(headers.BlackElo),
    blackResult: myResultFromPgnResult(headers.Result, 'black'),
    myColor,
    myResult,
    ecoCode: headers.ECO ?? null,
    ecoName: ecoUrl ? ecoNameFromUrl(ecoUrl) : null,
    ecoUrl,
    archiveYm: 'manual',
    createdAt: new Date().toISOString(),
  }
}
