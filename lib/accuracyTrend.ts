import { formatDate } from './dates'
import { summarizeMoveQuality } from './moveQuality'
import type { AccuracyTrendPoint, Game, GameAnalysis } from './types'

/** Own-side accuracy per analyzed game, oldest first. */
export function buildAccuracyTrend(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
): AccuracyTrendPoint[] {
  const points: AccuracyTrendPoint[] = []

  for (const game of games) {
    if (!game.movesSan) continue
    const analysis = analysesByGameId.get(game.id)
    if (!analysis) continue

    const summary = summarizeMoveQuality(analysis.evals, game.movesSan, game.initialFen)
    const mine = game.myColor === 'white' ? summary.white : summary.black
    const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername

    points.push({
      gameId: game.id,
      endTime: game.endTime,
      accuracy: mine.accuracy,
      gameLabel: `vs ${opponent} · ${formatDate(game.endTime)}`,
    })
  }

  return points.sort((a, b) => a.endTime - b.endTime)
}

export const ROLLING_AVERAGE_WINDOW = 10

/**
 * Trailing rolling average aligned with `points`. The window shrinks for the
 * first few points so the line starts at the first game.
 */
export function rollingAverageAccuracy(
  points: AccuracyTrendPoint[],
  window = ROLLING_AVERAGE_WINDOW,
): number[] {
  const out: number[] = []
  let sum = 0

  for (let i = 0; i < points.length; i++) {
    sum += points[i].accuracy
    if (i >= window) sum -= points[i - window].accuracy
    const count = Math.min(window, i + 1)
    out.push(Math.round((sum / count) * 10) / 10)
  }

  return out
}
