import { Chess } from 'chess.js'
import type { Game } from './types'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Standard-rules chess, from any starting position. Sync keeps every
 *  variant (Chess960, three-check, crazyhouse, …), but Stockfish evaluates
 *  standard rules only, so a variant's evals, blunders and accuracy would be
 *  wrong. */
export function isStandardChess(game: Pick<Game, 'rules'>): boolean {
  return game.rules === 'chess'
}

/** Standard chess from the normal starting position — the only games where
 *  matching SAN from move 1 (opening families, repertoire diffing, lesson
 *  counts) means anything. A custom-position start that happens to open with
 *  `e4` isn't a King's Pawn game. */
export function startsFromStandardPosition(game: Pick<Game, 'rules' | 'initialFen'>): boolean {
  return isStandardChess(game) && game.initialFen === START_FEN
}

/** Walks a game's moves from its starting FEN, returning every resulting
 *  position — index 0 is the starting position, index i+1 is after
 *  movesSan[i]. Shared by board replay and engine analysis, both of which
 *  need the full position list rather than just the final one. */
export function buildPositions(initialFen: string, movesSan: string[]): string[] {
  const chess = new Chess(initialFen)
  const positions = [chess.fen()]
  for (const move of movesSan) {
    chess.move(move)
    positions.push(chess.fen())
  }
  return positions
}
