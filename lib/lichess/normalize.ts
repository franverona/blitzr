import { parseManualGame } from '../manualGame'
import type { Game } from '../types'
import type { LichessGame } from './client'

/** Not over yet: the month holding it stays open until it ends. */
export function isOngoing(raw: LichessGame): boolean {
  return raw.status === 'started' || raw.status === 'created'
}

// Lichess's statuses, as Chess.com's result codes for the side that lost.
const LOSS_CODES: Record<string, string> = {
  resign: 'resigned',
  outoftime: 'timeout',
  // The opponent left and the user claimed the win.
  timeout: 'abandoned',
}

/**
 * A finished Lichess game as a `Game`, or null for one with nothing to replay: aborted, or a
 * variant chess.js can't read (Horde has no white king, Crazyhouse drops). The PGN does most of
 * the work, through the same parser as a pasted game.
 */
export function normalizeLichessGame(
  raw: LichessGame,
  username: string,
  archiveYm: string,
): Game | null {
  if (isOngoing(raw) || raw.status === 'aborted' || raw.status === 'noStart') return null
  let game: Game
  try {
    game = parseManualGame(raw.pgn, username)
  } catch {
    return null
  }

  let { whiteResult, blackResult } = game
  const loss = LOSS_CODES[raw.status]
  if (raw.winner && loss) {
    if (raw.winner === 'white') blackResult = loss
    else whiteResult = loss
  } else if (!raw.winner && raw.status === 'outoftime') {
    // Flagged against a side that couldn't mate.
    whiteResult = blackResult = 'timevsinsufficient'
  } else if (!raw.winner && whiteResult === 'draw') {
    // Lichess's "draw" is agreed unless the final position says otherwise (parsed above).
    whiteResult = blackResult = 'agreed'
  }

  return {
    ...game,
    // Prefixed: Chess.com's uuids and Lichess's ids are different shapes, but nothing promises it.
    id: `lichess:${raw.id}`,
    timeControl: raw.clock ? `${raw.clock.initial}+${raw.clock.increment}` : '',
    timeClass: raw.speed === 'ultraBullet' ? 'bullet' : raw.speed,
    rated: raw.rated,
    endTime: Math.floor(raw.lastMoveAt / 1000),
    whiteResult,
    blackResult,
    archiveYm,
  }
}
