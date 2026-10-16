import { Chess } from 'chess.js'
import type { Game } from './types'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Stockfish only evaluates standard rules; sync keeps every variant. */
export function isStandardChess(game: Pick<Game, 'rules'>): boolean {
  return game.rules === 'chess'
}

/** Required wherever SAN is matched from move 1 (openings, repertoire, lessons). */
export function startsFromStandardPosition(game: Pick<Game, 'rules' | 'initialFen'>): boolean {
  return isStandardChess(game) && game.initialFen === START_FEN
}

/** Index 0 is the starting position, index i+1 is after movesSan[i]. */
export function buildPositions(initialFen: string, movesSan: string[]): string[] {
  const chess = new Chess(initialFen)
  const positions = [chess.fen()]
  for (const move of movesSan) {
    chess.move(move)
    positions.push(chess.fen())
  }
  return positions
}
