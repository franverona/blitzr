import { BLUNDER_THRESHOLD_CP, evalBarPercent, moveSwingCp } from './analysis'
import type { PositionEval } from './types'

export type MoveQualityTier = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export const MOVE_QUALITY_TIERS: readonly MoveQualityTier[] = [
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
]

/**
 * Buckets one move's centipawn swing (see moveSwingCp, lib/analysis.ts) into
 * a Chess.com-style quality tier. The "blunder" cutoff is deliberately the
 * same BLUNDER_THRESHOLD_CP findBlunders() already uses, so a move that
 * lands in this tier here is exactly one findBlunders() would also flag —
 * this is a finer-grained view of the same swing, not a competing one.
 * Thresholds below that are this module's own bands, not derived from
 * anywhere else — there's no canonical source for them.
 */
export function classifyMoveQuality(swingCp: number): MoveQualityTier {
  if (swingCp <= 0) return 'best'
  if (swingCp < 10) return 'excellent'
  if (swingCp < 30) return 'good'
  if (swingCp < 60) return 'inaccuracy'
  if (swingCp < BLUNDER_THRESHOLD_CP) return 'mistake'
  return 'blunder'
}

/**
 * Per-move accuracy from a win% drop — the same formula Lichess's own
 * accuracy feature uses: a move that costs no win% scores ~100, and
 * accuracy decays smoothly (not linearly) as the drop grows, so one bad
 * move in an already-decided position doesn't tank the score the way a
 * blunder from an equal position does.
 */
function moveAccuracy(winPctBefore: number, winPctAfter: number): number {
  const drop = Math.max(0, winPctBefore - winPctAfter)
  const raw = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  return Math.min(100, Math.max(0, raw))
}

export type MoveQualityCounts = Record<MoveQualityTier, number>

export interface SideAccuracy {
  /** 0-100, rounded to one decimal place like Chess.com's own display. */
  accuracy: number
  counts: MoveQualityCounts
}

export interface GameAccuracySummary {
  white: SideAccuracy
  black: SideAccuracy
}

function emptyCounts(): MoveQualityCounts {
  return { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
}

// A side with no moves at all (e.g. a 1-ply game) reads as a clean 100
// rather than 0 — there's nothing to have gotten wrong.
function average(nums: number[]): number {
  if (nums.length === 0) return 100
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

/**
 * A Chess.com-style per-game review: one accuracy score and a tally of
 * move-quality tiers, for each side. Walks the same evals/movesSan pair
 * findBlunders() does, just scoring every move instead of only the ones
 * that cross the blunder threshold.
 */
export function summarizeMoveQuality(
  evals: PositionEval[],
  movesSan: string[],
): GameAccuracySummary {
  const counts = { white: emptyCounts(), black: emptyCounts() }
  const perMoveAccuracy: { white: number[]; black: number[] } = { white: [], black: [] }

  for (let i = 0; i < movesSan.length; i++) {
    const before = evals[i]
    const after = evals[i + 1]
    if (!before || !after) continue

    const whiteToMove = i % 2 === 0
    const side = whiteToMove ? 'white' : 'black'
    const winBefore = whiteToMove ? evalBarPercent(before) : 100 - evalBarPercent(before)
    const winAfter = whiteToMove ? evalBarPercent(after) : 100 - evalBarPercent(after)

    perMoveAccuracy[side].push(moveAccuracy(winBefore, winAfter))
    counts[side][classifyMoveQuality(moveSwingCp(before, after, whiteToMove))]++
  }

  return {
    white: { accuracy: average(perMoveAccuracy.white), counts: counts.white },
    black: { accuracy: average(perMoveAccuracy.black), counts: counts.black },
  }
}
