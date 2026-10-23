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

// Chess.com localizes Termination ("X won by resignation", "ha ganado por jaque mate");
// Lichess uses "Time forfeit"/"Abandoned". Unmatched text keeps plain loss/draw.
const LOSS_TERMINATIONS: [RegExp, string][] = [
  [/checkmate|jaque mate/i, 'checkmated'],
  // Spanish Chess.com's resign button is "Abandonar", so "por abandono" is a resignation.
  [/resign|por abandono/i, 'resigned'],
  [/abandon/i, 'abandoned'],
  [/on time|time forfeit|por tiempo/i, 'timeout'],
]
const DRAW_TERMINATIONS: [RegExp, string][] = [
  [/(time|tiempo).*insufficient|insuficiente.*tiempo/i, 'timevsinsufficient'],
  [/agree|acuerdo/i, 'agreed'],
  [/repetition|repetici[oó]n/i, 'repetition'],
  [/stalemate|ahogado/i, 'stalemate'],
  [/insufficient|insuficiente/i, 'insufficient'],
  [/50/, '50move'],
]

function terminationCode(termination: string | undefined, table: [RegExp, string][]) {
  return termination ? table.find(([pattern]) => pattern.test(termination))?.[1] : undefined
}

/** Chess.com-style per-player result codes, so badges and loss reasons work as for synced games. */
function resultCodes(
  result: PgnResult,
  termination: string | undefined,
  finalPosition: Chess,
): { white: string; black: string } {
  if (result === '1/2-1/2') {
    const code =
      (finalPosition.isStalemate() && 'stalemate') ||
      (finalPosition.isInsufficientMaterial() && 'insufficient') ||
      (finalPosition.isThreefoldRepetition() && 'repetition') ||
      terminationCode(termination, DRAW_TERMINATIONS) ||
      'draw'
    return { white: code, black: code }
  }
  const loss = finalPosition.isCheckmate()
    ? 'checkmated'
    : (terminationCode(termination, LOSS_TERMINATIONS) ?? 'loss')
  return result === '1-0' ? { white: 'win', black: loss } : { white: loss, black: 'win' }
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

// Chess.com's `rules` values: "Chess960" -> "chess960", "King of the Hill" -> "kingofthehill".
// Lichess's "From Position" is standard rules from a FEN.
function rulesFromVariant(variant: string | undefined): string {
  if (!variant || /^(standard|from position)$/i.test(variant)) return 'chess'
  return variant.toLowerCase().replace(/[^a-z0-9]/g, '')
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

  let myColor: MyColor
  if (side === 'auto') {
    const name = username.toLowerCase()
    if (headers.White.toLowerCase() === name) myColor = 'white'
    else if (headers.Black.toLowerCase() === name) myColor = 'black'
    else throw new Error(getStrings().manualGame.notInGame(username))
  } else {
    // A game the user didn't play is shown from White's side.
    myColor = side === 'notMine' ? 'white' : side
  }
  const myResult = myResultFromPgnResult(result, myColor)
  // Chess.com's Termination names the winner, so a name like "NeverResign" mustn't match.
  const termination = [headers.White, headers.Black].reduce(
    (text, name) => text?.split(name).join(''),
    headers.Termination,
  )
  const codes = resultCodes(result, termination, chess)

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
    rules: rulesFromVariant(headers.Variant),
    rated: false,
    endTime: endTimeFromPgnDate(headers),
    whiteUsername: headers.White,
    whiteRating: ratingFromHeader(headers.WhiteElo),
    whiteResult: codes.white,
    blackUsername: headers.Black,
    blackRating: ratingFromHeader(headers.BlackElo),
    blackResult: codes.black,
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

// Chess.com URLs vary: "/analysis/game/…/analysis", "?move=0"; the type and id are what match.
const CHESSCOM_GAME_ID = /\/game\/(live|daily|computer)\/(\d+)/

/** Keys a game can be matched on: its Chess.com game id, and its players plus moves. */
function duplicateKeys(game: Game): string[] {
  const keys = [
    `players:${game.whiteUsername.toLowerCase()}|${game.blackUsername.toLowerCase()}|${(game.movesSan ?? []).join(' ')}`,
  ]
  const id = game.url.match(CHESSCOM_GAME_ID)
  if (id) keys.push(`chesscom:${id[1]}/${id[2]}`)
  return keys
}

/**
 * A game in `existing` that is the same game as `game`. A pasted copy has a
 * random id, so the id-based ON CONFLICT can't catch it; this can.
 */
export function findDuplicateGame(game: Game, existing: Game[]): Game | undefined {
  const keys = new Set(duplicateKeys(game))
  return existing.find((other) => duplicateKeys(other).some((key) => keys.has(key)))
}
