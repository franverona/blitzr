import { Chess } from 'chess.js'
import { ecoNameFromUrl, parsePgnHeaders } from './chesscom/normalize'
import { getStrings } from './i18n/strings'
import type { Game, GameSite, MyColor, MyResult } from './types'

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

// PGN dates are "YYYY.MM.DD" with no time, which would land at midnight and sort below
// same-day synced games, so the current time of day is added. Both in local time, as every
// date is shown: UTC would move a game pasted near midnight to the next or previous day.
function endTimeFromPgnDate(headers: Record<string, string>): number {
  const now = new Date()
  const match = (headers.EndDate ?? headers.Date)?.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
  if (!match) return Math.floor(now.getTime() / 1000)
  const local = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  )
  return Number.isNaN(local.getTime())
    ? Math.floor(now.getTime() / 1000)
    : Math.floor(local.getTime() / 1000)
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

/** Lichess when the PGN's `Site` is a Lichess game, else Chess.com (what pasted games always were). */
export function pgnSite(pgn: string): GameSite {
  return lichessUrl(parsePgnHeaders(pgn).Site) ? 'lichess' : 'chesscom'
}

/**
 * The site's time class for a PGN `TimeControl`, by estimated duration (base + 40 × increment).
 * Chess.com's daily games are `1/<seconds per move>`, Lichess's correspondence ones `-`.
 */
export function timeClassFromControl(timeControl: string | undefined, site: GameSite): string {
  if (/^1\/\d+$/.test(timeControl ?? '')) return 'daily'
  if (site === 'lichess' && timeControl === '-') return 'correspondence'
  const match = timeControl?.match(/^(\d+)(?:\+(\d+))?$/)
  if (!match) return 'unknown'
  const seconds = Number(match[1]) + 40 * Number(match[2] ?? 0)
  if (seconds < 180) return 'bullet'
  if (site === 'chesscom') return seconds < 600 ? 'blitz' : 'rapid'
  return seconds < 480 ? 'blitz' : seconds < 1500 ? 'rapid' : 'classical'
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

  const ecoUrl = chesscomUrl(headers.ECOUrl)
  const lichessLink = lichessUrl(headers.Site)

  return {
    id: crypto.randomUUID(),
    url: lichessLink ?? chesscomUrl(headers.Link) ?? '',
    pgn,
    movesSan,
    initialFen: headers.FEN ?? new Chess().fen(),
    finalFen,
    timeControl: headers.TimeControl ?? '',
    timeClass: timeClassFromControl(headers.TimeControl, lichessLink ? 'lichess' : 'chesscom'),
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
    // Lichess names the opening itself; Chess.com only in its ECOUrl.
    ecoName: ecoUrl ? ecoNameFromUrl(ecoUrl) : (headers.Opening ?? null),
    ecoUrl,
    archiveYm: 'manual',
    createdAt: new Date().toISOString(),
    site: lichessLink ? 'lichess' : 'chesscom',
  }
}

/**
 * `raw` if it's an https chess.com URL, else null. A pasted PGN's `Link` and `ECOUrl` become
 * links on the game page, and `Link`'s game id decides duplicates on its own, so a forged one
 * pointing at a real game's id would make sync skip that game for good.
 */
function chesscomUrl(raw: string | undefined): string | null {
  if (!raw || !URL.canParse(raw)) return null
  const url = new URL(raw)
  return url.protocol === 'https:' &&
    (url.hostname === 'chess.com' || url.hostname === 'www.chess.com')
    ? raw
    : null
}

// "https://lichess.org/AbCd1234" (the API's exports: "/game/AbCd1234"), maybe with a player
// suffix or "/black": the first 8 are the id.
const LICHESS_GAME_ID = /^\/(?:game\/)?([A-Za-z0-9]{8})(?:[A-Za-z0-9]{4})?(?:\/|$)/

/** The game's canonical https lichess.org URL, else null. Same reasoning as `chesscomUrl()`. */
function lichessUrl(raw: string | undefined): string | null {
  if (!raw || !URL.canParse(raw)) return null
  const url = new URL(raw)
  const id = url.pathname.match(LICHESS_GAME_ID)
  return url.protocol === 'https:' && url.hostname === 'lichess.org' && id
    ? `https://lichess.org/${id[1]}`
    : null
}

// Chess.com URLs vary: "/analysis/game/…/analysis", "?move=0"; the type and id are what match.
const CHESSCOM_GAME_ID = /\/game\/(live|daily|computer)\/(\d+)/

/** The site's own game id, prefixed with the site, so ids from the two sites never match. */
function siteGameId(game: Game): string | undefined {
  const lichess = lichessUrl(game.url) && new URL(game.url).pathname.match(LICHESS_GAME_ID)
  if (lichess) return `lichess/${lichess[1]}`
  // Checked here too for a game pasted before `chesscomUrl()` filtered its link.
  const path = chesscomUrl(game.url) && new URL(game.url).pathname
  const id = path ? path.match(CHESSCOM_GAME_ID) : null
  return id ? `${id[1]}/${id[2]}` : undefined
}

function playersAndMoves(game: Game): string {
  return `${game.whiteUsername.toLowerCase()}|${game.blackUsername.toLowerCase()}|${(game.movesSan ?? []).join(' ')}`
}

// A pasted game's end time is only its PGN date (plus the time of day it was pasted),
// so "the same day" allows a day either way.
const SAME_GAME_MAX_SECONDS_APART = 2 * 24 * 60 * 60

/**
 * A game in `existing` that is the same game as `game`. A pasted copy has a
 * random id, so the id-based ON CONFLICT can't catch it; this can. Two site game
 * ids decide on their own; otherwise the same players and moves must also end within
 * a day or so, since bot rematches and quick repetition draws replay the same moves.
 */
export function findDuplicateGame(game: Game, existing: Game[]): Game | undefined {
  const id = siteGameId(game)
  const key = playersAndMoves(game)
  return existing.find((other) => {
    const otherId = siteGameId(other)
    if (id && otherId) return id === otherId
    return (
      playersAndMoves(other) === key &&
      Math.abs(other.endTime - game.endTime) <= SAME_GAME_MAX_SECONDS_APART
    )
  })
}
