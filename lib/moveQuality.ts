import {
  BLUNDER_THRESHOLD_WIN_DROP,
  evalBarPercent,
  moveWinDrop,
  whiteToMove,
  winDropFromEqual,
} from './analysis'
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

const EXCELLENT_WIN_DROP = winDropFromEqual(10)
const GOOD_WIN_DROP = winDropFromEqual(30)
const INACCURACY_WIN_DROP = winDropFromEqual(60)

/**
 * Chess.com-style tier for a move's win-% drop. The blunder cutoff matches
 * findBlunders(); the lower bands are our own.
 */
export function classifyMoveQuality(winDrop: number): MoveQualityTier {
  if (winDrop <= 0) return 'best'
  if (winDrop < EXCELLENT_WIN_DROP) return 'excellent'
  if (winDrop < GOOD_WIN_DROP) return 'good'
  if (winDrop < INACCURACY_WIN_DROP) return 'inaccuracy'
  if (winDrop < BLUNDER_THRESHOLD_WIN_DROP) return 'mistake'
  return 'blunder'
}

/** Lichess's per-move accuracy formula from the win% drop. */
function moveAccuracy(winPctBefore: number, winPctAfter: number): number {
  const drop = Math.max(0, winPctBefore - winPctAfter)
  const raw = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  return Math.min(100, Math.max(0, raw))
}

export type MoveQualityCounts = Record<MoveQualityTier, number>

export interface SideAccuracy {
  /** 0-100, one decimal place. */
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

// No moves means nothing went wrong.
function average(nums: number[]): number {
  if (nums.length === 0) return 100
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

/** Accuracy and move-quality tally per side. */
export function summarizeMoveQuality(
  evals: PositionEval[],
  movesSan: string[],
  initialFen?: string,
): GameAccuracySummary {
  const counts = { white: emptyCounts(), black: emptyCounts() }
  const perMoveAccuracy: { white: number[]; black: number[] } = { white: [], black: [] }

  for (let i = 0; i < movesSan.length; i++) {
    const before = evals[i]
    const after = evals[i + 1]
    if (!before || !after) continue

    const whiteMoved = whiteToMove(i + 1, initialFen)
    const side = whiteMoved ? 'white' : 'black'
    const winBefore = whiteMoved ? evalBarPercent(before) : 100 - evalBarPercent(before)
    const winAfter = whiteMoved ? evalBarPercent(after) : 100 - evalBarPercent(after)

    perMoveAccuracy[side].push(moveAccuracy(winBefore, winAfter))
    counts[side][classifyMoveQuality(moveWinDrop(before, after, whiteMoved))]++
  }

  return {
    white: { accuracy: average(perMoveAccuracy.white), counts: counts.white },
    black: { accuracy: average(perMoveAccuracy.black), counts: counts.black },
  }
}
