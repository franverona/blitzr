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

// Each position is evaluated independently (no shared search state between
// plies), so multiple single-threaded engine Workers can churn through a
// game's positions concurrently — capped well below hardwareConcurrency
// since each Worker is itself a several-hundred-KB WASM instance, not a
// free thread.
const MAX_ENGINE_POOL_SIZE = 4

function createEnginePool(wanted: number): StockfishEngine[] {
  const size = Math.max(
    1,
    Math.min(MAX_ENGINE_POOL_SIZE, navigator.hardwareConcurrency || 1, wanted),
  )
  return Array.from({ length: size }, () => new StockfishEngine())
}

/**
 * Evaluates every position in a game, spread across a pool of engines (each
 * pulling the next not-yet-started position as soon as it's free — a simple
 * work-stealing queue, since positions can take very different times to
 * search). Reports progress as each position finishes so the caller can show
 * something better than a spinner for what's typically a several-second-long
 * analysis.
 */
async function analyzePositions(
  engines: StockfishEngine[],
  positions: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<PositionEval[]> {
  const evals: PositionEval[] = new Array(positions.length)
  let nextIndex = 0
  let doneCount = 0

  async function runOnEngine(engine: StockfishEngine): Promise<void> {
    while (nextIndex < positions.length) {
      const i = nextIndex++
      evals[i] = terminalEval(positions[i]) ?? (await engine.evaluate(positions[i]))
      doneCount++
      onProgress?.(doneCount, positions.length)
    }
  }

  await Promise.all(engines.map(runOnEngine))
  return evals
}

export async function analyzeGame(
  initialFen: string,
  movesSan: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<PositionEval[]> {
  const positions = buildPositions(initialFen, movesSan)
  const engines = createEnginePool(positions.length)
  try {
    return await analyzePositions(engines, positions, onProgress)
  } finally {
    engines.forEach((engine) => engine.terminate())
  }
}

export interface BulkAnalysisProgress {
  gamesDone: number
  gamesTotal: number
  positionsDone: number
  positionsTotal: number
}

/**
 * Analyzes several games with a single shared engine pool — spinning up a
 * fresh Worker (loading the ~7MB WASM build, then a UCI handshake) per game
 * would repeat that setup cost for every game in what's meant to be a bulk
 * catch-up run, so the pool is built once and reused across every game.
 * Each game's result is handed to `onGameDone` as soon as that game finishes
 * (not batched at the end) so a caller can persist incrementally — if the
 * run is stopped partway, whatever's already been saved stays saved.
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
  const engines = createEnginePool(MAX_ENGINE_POOL_SIZE)
  try {
    for (let g = 0; g < games.length; g++) {
      if (shouldContinue && !shouldContinue()) break
      const game = games[g]
      const positions = buildPositions(game.initialFen, game.movesSan)
      const evals = await analyzePositions(engines, positions, (done, total) => {
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
    engines.forEach((engine) => engine.terminate())
  }
}
