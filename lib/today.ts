import { findBlunders, whiteToMove } from './analysis'
import { summarizeMoveQuality } from './moveQuality'
import { startsFromStandardPosition } from './positions'
import { diffGameAgainstRepertoire } from './repertoire'
import type { Game, GameAnalysis, MyResult, RepertoireColor, RepertoireNode } from './types'

const DAY_SECONDS = 24 * 60 * 60

/** Local calendar day, "YYYY-MM-DD" (matches formatDate()'s local time). */
export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export interface RatingChange {
  timeClass: string
  rating: number
  change: number
}

/**
 * W/L/D over the last `days` days, plus each time class's latest rating and
 * its change since the last game before the window (or the first in it).
 * Chess.com ratings are per time class, so they're never mixed.
 */
export function recentResults(
  games: Game[],
  now: Date,
  days = 7,
): { wins: number; losses: number; draws: number; ratings: RatingChange[] } {
  const since = now.getTime() / 1000 - days * DAY_SECONDS
  const counts: Record<MyResult, number> = { win: 0, loss: 0, draw: 0 }
  const byClass = new Map<string, { baseline?: number; first?: number; last?: number }>()

  for (const game of [...games].sort((a, b) => a.endTime - b.endTime)) {
    const rating = game.myColor === 'white' ? game.whiteRating : game.blackRating
    const inWindow = game.endTime >= since
    if (inWindow) counts[game.myResult]++
    if (!game.rated || rating === null) continue
    const entry = byClass.get(game.timeClass) ?? {}
    if (!inWindow) entry.baseline = rating
    else {
      entry.first ??= rating
      entry.last = rating
    }
    byClass.set(game.timeClass, entry)
  }

  const ratings: RatingChange[] = []
  for (const [timeClass, { baseline, first, last }] of byClass) {
    if (last === undefined || first === undefined) continue
    ratings.push({ timeClass, rating: last, change: last - (baseline ?? first) })
  }
  return { wins: counts.win, losses: counts.loss, draws: counts.draw, ratings }
}

/** Consecutive review days ending today, or yesterday if today has none yet. */
export function drillStreak(reviewDays: string[], now: Date): number {
  const days = new Set(reviewDays)
  const cursor = new Date(now)
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(localDay(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Whether each of the last `days` local days had a review, oldest first (today last). */
export function drillWeek(reviewDays: string[], now: Date, days = 7): boolean[] {
  const reviewed = new Set(reviewDays)
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(now)
    day.setDate(day.getDate() - (days - 1 - i))
    return reviewed.has(localDay(day))
  })
}

/**
 * Of the most recent `limit` games with a repertoire for their color, how many
 * left it. `games` must be newest first.
 */
export function repertoireDeviations(
  games: Game[],
  repertoireByColor: Map<RepertoireColor, RepertoireNode[]>,
  limit = 10,
): { deviated: number; considered: number } {
  let deviated = 0
  let considered = 0
  for (const game of games) {
    if (considered >= limit) break
    const nodes = repertoireByColor.get(game.myColor) ?? []
    if (!game.movesSan || nodes.length === 0 || !startsFromStandardPosition(game)) continue
    considered++
    if (diffGameAgainstRepertoire(game.movesSan, game.myColor, nodes).deviationPly !== null) {
      deviated++
    }
  }
  return { deviated, considered }
}

/** Own-side accuracy and first own blunder of one game; nulls without analysis. */
export function gameReview(
  game: Game,
  analysis: GameAnalysis | undefined,
): { accuracy: number | null; firstBlunderPly: number | null } {
  if (!analysis || !game.movesSan) return { accuracy: null, firstBlunderPly: null }
  const summary = summarizeMoveQuality(analysis.evals, game.movesSan, game.initialFen)
  const mine = game.myColor === 'white' ? summary.white : summary.black
  const firstBlunder = findBlunders(analysis.evals, game.movesSan, game.initialFen).find(
    (b) => whiteToMove(b.ply, game.initialFen) === (game.myColor === 'white'),
  )
  return { accuracy: mine.accuracy, firstBlunderPly: firstBlunder?.ply ?? null }
}
