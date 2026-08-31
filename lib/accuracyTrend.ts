import { formatDate } from './dates'
import { summarizeMoveQuality } from './moveQuality'
import type { AccuracyTrendPoint, Game, GameAnalysis } from './types'

/**
 * Own-side accuracy per analyzed game, oldest first — the raw series behind
 * the /blunders accuracy trend chart. Mirrors getGameAccuracyById()'s
 * (app/actions.ts) own side-selection logic, just kept separate since that
 * one returns an id-keyed map with no ordering, and a trend needs both a
 * date and a stable chronological order to plot.
 */
export function buildAccuracyTrend(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
): AccuracyTrendPoint[] {
  const points: AccuracyTrendPoint[] = []

  for (const game of games) {
    if (!game.movesSan) continue
    const analysis = analysesByGameId.get(game.id)
    if (!analysis) continue

    const summary = summarizeMoveQuality(analysis.evals, game.movesSan)
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
 * Trailing rolling average, aligned 1:1 with `points` (index i is the
 * average of the up-to-`window` most recent points ending at i) — a raw
 * per-game accuracy is too noisy on its own to read as "am I improving," so
 * the chart draws this alongside the raw dots rather than instead of them.
 * The window shrinks for the first few points rather than staying undefined
 * until `window` games exist, so the average line is never missing its
 * start.
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
