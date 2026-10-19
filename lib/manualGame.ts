import { Chess } from 'chess.js'
import { ecoNameFromUrl, parsePgnHeaders } from './chesscom/normalize'
import { getStrings } from './i18n/strings'
import type { Game, MyColor, MyResult } from './types'

// Builds a Game from a pasted PGN's headers. Unlike normalizeGame(), invalid
// movetext throws: a manual game exists to be analyzed.

type PgnResult = '1-0' | '0-1' | '1/2-1/2'

// Missing or `*` Result: infer from a decisive final position, else reject.
function pgnResult(headers: Record<string, string>, finalPosition: Chess): PgnResult {
  const result = headers.Result
  if (result === '1-0' || result === '0-1' || result === '1/2-1/2') return result
  if (finalPosition.isCheckmate()) return finalPosition.turn() === 'w' ? '0-1' : '1-0'
  if (finalPosition.isDraw()) return '1/2-1/2'
  throw new Error(getStrings().manualGame.noResult)
}

function myResultFromPgnResult(result: PgnResult, color: MyColor): MyResult {
  if (result === '1/2-1/2') return 'draw'
  return (result === '1-0') === (color === 'white') ? 'win' : 'loss'
}

// PGN dates are "YYYY.MM.DD" with no time, which would land at midnight UTC
// and sort below same-day synced games. Use the current time of day instead.
function endTimeFromPgnDate(headers: Record<string, string>): number {
  const raw = headers.EndDate ?? headers.Date
  const parsedDateOnly = raw ? Date.parse(raw.replace(/\./g, '-')) : NaN
  if (Number.isNaN(parsedDateOnly)) return Math.floor(Date.now() / 1000)
  const msSinceMidnightUtc = Date.now() % 86_400_000
  return Math.floor((parsedDateOnly + msSinceMidnightUtc) / 1000)
}

function ratingFromHeader(value: string | undefined): number | null {
  const rating = Number.parseInt(value ?? '', 10)
  return Number.isNaN(rating) ? null : rating
}

export function parseManualGame(pgn: string, username: string): Game {
  const headers = parsePgnHeaders(pgn)
  if (!headers.White || !headers.Black) {
    throw new Error(getStrings().manualGame.missingPlayers)
  }

  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
  } catch {
    throw new Error(getStrings().manualGame.badMovetext)
  }
  const movesSan = chess.history()
  if (movesSan.length === 0) {
    throw new Error(getStrings().manualGame.noMoves)
  }
  const finalFen = chess.fen()
  const result = pgnResult(headers, chess)

  const isBlack = headers.Black.toLowerCase() === username.toLowerCase()
  // ponytail: a pasted game may not involve the user at all; default to White.
  const myColor: MyColor = isBlack ? 'black' : 'white'
  const myResult = myResultFromPgnResult(result, myColor)

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
    whiteResult: myResultFromPgnResult(result, 'white'),
    blackUsername: headers.Black,
    blackRating: ratingFromHeader(headers.BlackElo),
    blackResult: myResultFromPgnResult(result, 'black'),
    myColor,
    myResult,
    ecoCode: headers.ECO ?? null,
    ecoName: ecoUrl ? ecoNameFromUrl(ecoUrl) : null,
    ecoUrl,
    archiveYm: 'manual',
    createdAt: new Date().toISOString(),
  }
}
