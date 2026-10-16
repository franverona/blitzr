import { Chess } from 'chess.js'
import { buildPositions } from '../positions'
import type { PositionEval } from '../types'
import { StockfishEngine } from './client'

// Mate/stalemate positions are scored directly: the engine's mate-in-0
// output made the mating move itself look like a blunder.
export function terminalEval(fen: string): PositionEval | null {
  const chess = new Chess(fen)
  if (chess.isCheckmate()) {
    // The side to move is mated.
    const blackToMove = fen.split(' ')[1] === 'b'
    return { cp: null, mate: blackToMove ? 1 : -1, bestMove: null }
  }
  if (chess.isStalemate()) {
    return { cp: 0, mate: null, bestMove: null }
  }
  return null
}

// Positions are independent, so several Workers run in parallel; each is a
// sizable WASM instance, hence the cap.
const MAX_ENGINE_POOL_SIZE = 4

/** Per-position think time (ms) for batch analysis. */
export const ANALYSIS_STRENGTHS = { fast: 150, normal: 300, deep: 1000 } as const
export type AnalysisStrength = keyof typeof ANALYSIS_STRENGTHS
export const DEFAULT_ANALYSIS_STRENGTH: AnalysisStrength = 'normal'

function createEnginePool(wanted: number): StockfishEngine[] {
  const size = Math.max(
    1,
    Math.min(MAX_ENGINE_POOL_SIZE, navigator.hardwareConcurrency || 1, wanted),
  )
  return Array.from({ length: size }, () => new StockfishEngine())
}

/** Evaluates positions across the pool, each engine pulling the next one. */
async function analyzePositions(
  engines: StockfishEngine[],
  positions: string[],
  movetimeMs: number,
  onProgress?: (done: number, total: number) => void,
): Promise<PositionEval[]> {
  const evals: PositionEval[] = new Array(positions.length)
  let nextIndex = 0
  let doneCount = 0

  async function runOnEngine(engine: StockfishEngine): Promise<void> {
    while (nextIndex < positions.length) {
      const i = nextIndex++
      evals[i] = terminalEval(positions[i]) ?? (await engine.evaluate(positions[i], movetimeMs))
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
  movetimeMs: number = ANALYSIS_STRENGTHS[DEFAULT_ANALYSIS_STRENGTH],
): Promise<PositionEval[]> {
  const positions = buildPositions(initialFen, movesSan)
  const engines = createEnginePool(positions.length)
  try {
    return await analyzePositions(engines, positions, movetimeMs, onProgress)
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
 * Analyzes several games with one shared engine pool. Each result goes to
 * `onGameDone` as soon as it's ready; `shouldContinue` is checked between
 * games, so a cancelled run never leaves a partial game.
 */
export async function analyzeGames(
  games: { id: string; initialFen: string; movesSan: string[] }[],
  onGameDone: (gameId: string, evals: PositionEval[]) => void | Promise<void>,
  onProgress?: (progress: BulkAnalysisProgress) => void,
  shouldContinue?: () => boolean,
  movetimeMs: number = ANALYSIS_STRENGTHS[DEFAULT_ANALYSIS_STRENGTH],
): Promise<void> {
  const engines = createEnginePool(MAX_ENGINE_POOL_SIZE)
  try {
    for (let g = 0; g < games.length; g++) {
      if (shouldContinue && !shouldContinue()) break
      const game = games[g]
      const positions = buildPositions(game.initialFen, game.movesSan)
      const evals = await analyzePositions(engines, positions, movetimeMs, (done, total) => {
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
