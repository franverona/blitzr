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
async function analyzePositions(
  engine: StockfishEngine,
  positions: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<PositionEval[]> {
  const evals: PositionEval[] = []
  for (let i = 0; i < positions.length; i++) {
    evals.push(terminalEval(positions[i]) ?? (await engine.evaluate(positions[i])))
    onProgress?.(i + 1, positions.length)
  }
  return evals
}

export async function analyzeGame(
  initialFen: string,
  movesSan: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<PositionEval[]> {
  const positions = buildPositions(initialFen, movesSan)
  const engine = new StockfishEngine()
  try {
    return await analyzePositions(engine, positions, onProgress)
  } finally {
    engine.terminate()
  }
}

export interface BulkAnalysisProgress {
  gamesDone: number
  gamesTotal: number
  positionsDone: number
  positionsTotal: number
}

/**
 * Analyzes several games with a single shared engine — spinning up a fresh
 * Worker (loading the ~7MB WASM build, then a UCI handshake) per game would
 * repeat that setup cost for every game in what's meant to be a bulk catch-up
 * run. Each game's result is handed to `onGameDone` as soon as that game
 * finishes (not batched at the end) so a caller can persist incrementally —
 * if the run is stopped partway, whatever's already been saved stays saved.
 * `shouldContinue` is checked between games, not mid-game: a game already in
 * progress always finishes and gets saved, so there's never a partial-game
 * result to special-case.
 */
export async function analyzeGames(
  games: { id: string; initialFen: string; movesSan: string[] }[],
  onGameDone: (gameId: string, evals: PositionEval[]) => void | Promise<void>,
  onProgress?: (progress: BulkAnalysisProgress) => void,
  shouldContinue?: () => boolean,
): Promise<void> {
  const engine = new StockfishEngine()
  try {
    for (let g = 0; g < games.length; g++) {
      if (shouldContinue && !shouldContinue()) break
      const game = games[g]
      const positions = buildPositions(game.initialFen, game.movesSan)
      const evals = await analyzePositions(engine, positions, (done, total) => {
        onProgress?.({
          gamesDone: g,
          gamesTotal: games.length,
          positionsDone: done,
          positionsTotal: total,
        })
      })
      await onGameDone(game.id, evals)
    }
  } finally {
    engine.terminate()
  }
}
