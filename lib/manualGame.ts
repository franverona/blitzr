import { Chess } from 'chess.js'
import { ecoNameFromUrl, parsePgnHeaders } from './chesscom/normalize'
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
  throw new Error(
    'PGN has no final result — add a [Result "1-0"], [Result "0-1"] or [Result "1/2-1/2"] header.',
  )
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

/** 'auto' matches the username against the PGN's players. */
export type ManualGameSide = 'auto' | MyColor | 'notMine'

export function parseManualGame(
  pgn: string,
  username: string,
  side: ManualGameSide = 'auto',
): Game {
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
  if (movesSan.length === 0) {
    throw new Error('PGN has no moves — paste the full game, not just its headers.')
  }
  const finalFen = chess.fen()
  const result = pgnResult(headers, chess)

  let myColor: MyColor
  if (side === 'auto') {
    const name = username.toLowerCase()
    if (headers.White.toLowerCase() === name) myColor = 'white'
    else if (headers.Black.toLowerCase() === name) myColor = 'black'
    else
      throw new Error(
        `Neither player is ${username} — pick the side you played, or "Not me" to keep it out of your stats.`,
      )
  } else {
    // A game the user didn't play is shown from White's side.
    myColor = side === 'notMine' ? 'white' : side
  }
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
    isMine: side !== 'notMine',
    ecoCode: headers.ECO ?? null,
    ecoName: ecoUrl ? ecoNameFromUrl(ecoUrl) : null,
    ecoUrl,
    archiveYm: 'manual',
    createdAt: new Date().toISOString(),
  }
}
