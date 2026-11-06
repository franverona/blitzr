import { Chess } from 'chess.js'
import type { BotElo } from './botStrength'
import { parseManualGame } from './manualGame'
import { buildPositions, isStandardChess } from './positions'
import type { Game, MyColor } from './types'

// Long enough for any real game from any position; a guard against absurd payloads.
const MAX_PLIES = 600

export class PracticeGameError extends Error {}

/** The position at `ply` and the user's side there; a "not me" game: the side to move. */
export function practiceStart(source: Game, ply: number): { fen: string; myColor: MyColor } {
  const fen = buildPositions(source.initialFen, source.movesSan ?? [])[ply]
  const myColor = source.isMine ? source.myColor : fen.split(' ')[1] === 'w' ? 'white' : 'black'
  return { fen, myColor }
}

/**
 * A game played against the bot from `ply` of `source`, as a `Game` (`archiveYm: 'practice'`).
 * Replays the source to rebuild the start, then `movesSan` from it, so the client only sends
 * moves. Throws `PracticeGameError` on illegal or unfinished lines.
 */
export function buildPracticeGame({
  source,
  ply,
  movesSan,
  myName,
  elo,
  resigned,
  now,
}: {
  source: Game
  ply: number
  movesSan: string[]
  myName: string
  elo: BotElo
  resigned: boolean
  now: Date
}): Game {
  if (!source.movesSan || !isStandardChess(source) || source.archiveYm === 'practice') {
    throw new PracticeGameError('source can’t be practiced')
  }
  if (!Number.isInteger(ply) || ply < 0 || ply > source.movesSan.length) {
    throw new PracticeGameError('ply out of range')
  }
  if (movesSan.length === 0 || movesSan.length > MAX_PLIES) {
    throw new PracticeGameError('bad line length')
  }
  const { fen: startFen, myColor } = practiceStart(source, ply)

  const chess = new Chess(startFen)
  // A line without any of the user's moves isn't a game they played.
  let myMoves = 0
  for (const san of movesSan) {
    if (chess.turn() === myColor[0]) myMoves++
    try {
      chess.move(san)
    } catch {
      throw new PracticeGameError(`illegal move ${san}`)
    }
  }
  if (myMoves === 0) throw new PracticeGameError('no moves of the user')
  const over = chess.isGameOver()
  if (!over && !resigned) throw new PracticeGameError('game not finished')

  const botName = `Stockfish ${elo}`
  const white = myColor === 'white' ? myName : botName
  const black = myColor === 'white' ? botName : myName
  const winner = myColor === 'white' ? black : white
  chess.setHeader('White', white)
  chess.setHeader('Black', black)
  chess.setHeader('SetUp', '1')
  chess.setHeader('FEN', startFen)
  if (!over) {
    chess.setHeader('Result', myColor === 'white' ? '0-1' : '1-0')
    // parseManualGame() strips the player names, then reads "resignation".
    chess.setHeader('Termination', `${winner} won by resignation`)
  }

  const game = parseManualGame(chess.pgn(), '', myColor)
  return {
    ...game,
    url: '',
    timeControl: '',
    timeClass: 'practice',
    endTime: Math.floor(now.getTime() / 1000),
    ecoCode: null,
    ecoName: null,
    ecoUrl: null,
    archiveYm: 'practice',
    createdAt: now.toISOString(),
    practiceOf: { gameId: source.id, ply },
  }
}
