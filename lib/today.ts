import { findBlunders, whiteToMove } from './analysis'
import { summarizeMoveQuality } from './moveQuality'
import { moveNumberOfPly } from './san'
import { startsFromStandardPosition } from './positions'
import { diffGameAgainstRepertoire } from './repertoire'
import { countGamesReachingLine } from './openingTheory'
import type {
  Game,
  GameAnalysis,
  GameSite,
  Lesson,
  LessonProgress,
  MyResult,
  RepertoireColor,
  RepertoireNode,
} from './types'

const DAY_SECONDS = 24 * 60 * 60

/** Local calendar day, "YYYY-MM-DD" (matches formatDate()'s local time). */
export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export interface RatingChange {
  site: GameSite
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
  // Per site too: a Lichess rating isn't on Chess.com's scale.
  const byClass = new Map<
    string,
    { site: GameSite; timeClass: string; baseline?: number; first?: number; last?: number }
  >()

  for (const game of [...games].sort((a, b) => a.endTime - b.endTime)) {
    const rating = game.myColor === 'white' ? game.whiteRating : game.blackRating
    const inWindow = game.endTime >= since
    if (inWindow) counts[game.myResult]++
    if (!game.rated || rating === null) continue
    const key = `${game.site}:${game.timeClass}`
    const entry = byClass.get(key) ?? { site: game.site, timeClass: game.timeClass }
    if (!inWindow) entry.baseline = rating
    else {
      entry.first ??= rating
      entry.last = rating
    }
    byClass.set(key, entry)
  }

  const ratings: RatingChange[] = []
  for (const { site, timeClass, baseline, first, last } of byClass.values()) {
    if (last === undefined || first === undefined) continue
    ratings.push({ site, timeClass, rating: last, change: last - (baseline ?? first) })
  }
  return { wins: counts.win, losses: counts.loss, draws: counts.draw, ratings }
}

export type RatingGap = 'stronger' | 'similar' | 'weaker'

export interface RatingGapScores {
  site: GameSite
  /** `score`: a win 1, a draw ½, over `games`. */
  scores: Record<RatingGap, { games: number; score: number }>
}

/**
 * Per site, the score in rated games against opponents rated more than `margin` above the user,
 * within it, and more than it below. Unrated games are skipped: bot and coach games carry
 * ratings too. Sites keep their own scales.
 */
export function scoreByRatingGap(games: Game[], margin = 100): RatingGapScores[] {
  const bySite = new Map<GameSite, Record<RatingGap, { games: number; points: number }>>()
  for (const game of games) {
    const mine = game.myColor === 'white' ? game.whiteRating : game.blackRating
    const theirs = game.myColor === 'white' ? game.blackRating : game.whiteRating
    if (!game.rated || mine === null || theirs === null) continue
    const gap: RatingGap =
      theirs - mine > margin ? 'stronger' : mine - theirs > margin ? 'weaker' : 'similar'
    const site = bySite.get(game.site) ?? {
      stronger: { games: 0, points: 0 },
      similar: { games: 0, points: 0 },
      weaker: { games: 0, points: 0 },
    }
    site[gap].games++
    site[gap].points += game.myResult === 'win' ? 1 : game.myResult === 'draw' ? 0.5 : 0
    bySite.set(game.site, site)
  }
  return (['chesscom', 'lichess'] as const)
    .filter((site) => bySite.has(site))
    .map((site) => {
      const counts = bySite.get(site)!
      const scores = Object.fromEntries(
        (['stronger', 'similar', 'weaker'] as const).map((gap) => [
          gap,
          {
            games: counts[gap].games,
            score: counts[gap].games === 0 ? 0 : counts[gap].points / counts[gap].games,
          },
        ]),
      ) as RatingGapScores['scores']
      return { site, scores }
    })
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
): {
  analyzed: boolean
  /** null too when analyzed but the user never moved. */
  accuracy: number | null
  firstBlunderPly: number | null
  firstBlunderMove: number | null
} {
  if (!analysis || !game.movesSan)
    return { analyzed: false, accuracy: null, firstBlunderPly: null, firstBlunderMove: null }
  const summary = summarizeMoveQuality(analysis.evals, game.movesSan, game.initialFen)
  const mine = game.myColor === 'white' ? summary.white : summary.black
  const firstBlunder = findBlunders(analysis.evals, game.movesSan, game.initialFen).find(
    (b) => whiteToMove(b.ply, game.initialFen) === (game.myColor === 'white'),
  )
  return {
    analyzed: true,
    accuracy: mine.accuracy,
    firstBlunderPly: firstBlunder?.ply ?? null,
    firstBlunderMove: firstBlunder ? moveNumberOfPly(firstBlunder.ply, game.initialFen) : null,
  }
}

/** Keys into `s.today.lossReasons`. */
export type LossReason = 'timeout' | 'resigned' | 'checkmate' | 'abandoned' | 'other'

const LOSS_REASONS: Record<string, LossReason> = {
  timeout: 'timeout',
  resigned: 'resigned',
  checkmated: 'checkmate',
  abandoned: 'abandoned',
}

/** How `games` were lost, from the user's own result code, most common first. */
export function lossReasons(games: Game[]): { reason: LossReason; count: number }[] {
  const counts = new Map<LossReason, number>()
  for (const game of games) {
    if (game.myResult !== 'loss') continue
    const code = game.myColor === 'white' ? game.whiteResult : game.blackResult
    const reason = LOSS_REASONS[code] ?? 'other'
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }
  return [...counts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)
}

/** The lesson `games` reached most (ties go to the longer line), or null if none. */
export function suggestLesson(
  games: Game[],
  lessons: Lesson[],
): { lesson: Lesson; games: number } | null {
  let best: { lesson: Lesson; games: number } | null = null
  for (const lesson of lessons) {
    const reached = countGamesReachingLine(
      games,
      lesson.moves.map((m) => m.san),
    ).games
    if (reached === 0) continue
    if (
      !best ||
      reached > best.games ||
      (reached === best.games && lesson.moves.length > best.lesson.moves.length)
    ) {
      best = { lesson, games: reached }
    }
  }
  return best
}

/** A finished quiz and, where the lesson has Play (`playable`), a win there too. */
export function isLessonDone(progress: LessonProgress | undefined, playable: boolean): boolean {
  return Boolean(progress?.quizCompleted && (!playable || progress.playWon))
}

/** The unfinished endgame or position lesson your games reached most (ties go to the first
 *  listed), or null if none was reached. */
export function suggestEndgameLesson(
  reached: { lesson: Lesson; games: number }[],
  progress: Record<string, LessonProgress>,
): { lesson: Lesson; games: number } | null {
  let best: { lesson: Lesson; games: number } | null = null
  for (const candidate of reached) {
    if (candidate.games === 0 || isLessonDone(progress[candidate.lesson.slug], true)) continue
    if (!best || candidate.games > best.games) best = candidate
  }
  return best
}
