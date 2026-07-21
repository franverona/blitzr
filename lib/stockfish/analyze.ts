import { Chess } from 'chess.js'
import { buildPositions } from '../positions'
import type { PositionEval } from '../types'
import { StockfishEngine } from './client'

// A position with zero legal moves (checkmate/stalemate) has nothing for the
// engine to search — asking it for "go movetime" anyway produced ambiguous
// mate-in-0 output that made the checkmating move itself look like a
// blunder. Score these deterministically instead of asking the engine.
export function terminalEval(fen: string): PositionEval | null {
  const chess = new Chess(fen)
  if (chess.isCheckmate()) {
    // The side to move just got checkmated — bad for them, so from White's
    // perspective this is a win for White if Black is the one mated.
    const blackToMove = fen.split(' ')[1] === 'b'
    return { cp: null, mate: blackToMove ? 1 : -1, bestMove: null }
  }
  if (chess.isStalemate()) {
    return { cp: 0, mate: null, bestMove: null }
  }
  return null
}

/**
 * Evaluates every position in a game, one at a time (a single Worker has one
 * engine thread; there's nothing to parallelize). Reports progress as each
 * position finishes so the caller can show something better than a spinner
 * for what's typically a several-second-long analysis.
 */
export async function analyzeGame(
  initialFen: string,
  movesSan: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<PositionEval[]> {
  const positions = buildPositions(initialFen, movesSan)
  const engine = new StockfishEngine()

  try {
    const evals: PositionEval[] = []
    for (let i = 0; i < positions.length; i++) {
      evals.push(terminalEval(positions[i]) ?? (await engine.evaluate(positions[i])))
      onProgress?.(i + 1, positions.length)
    }
    return evals
  } finally {
    engine.terminate()
  }
}
