import {
  BLUNDER_THRESHOLD_WIN_DROP,
  evalBarPercent,
  moveWinDrop,
  whiteToMove,
  winDropFromEqual,
} from './analysis'
import { gamePhase, type GamePhase } from './material'
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
  /** 1-indexed plies of each tier's moves, in game order. */
  plies: Record<MoveQualityTier, number[]>
  /** Only with `positions`; null for a phase the side made no move in. */
  byPhase?: Record<GamePhase, number | null>
}

export interface GameAccuracySummary {
  white: SideAccuracy
  black: SideAccuracy
}

function emptyCounts(): MoveQualityCounts {
  return { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
}

function emptyPlies(): Record<MoveQualityTier, number[]> {
  return { best: [], excellent: [], good: [], inaccuracy: [], mistake: [], blunder: [] }
}

// No moves means nothing went wrong.
function average(nums: number[]): number {
  if (nums.length === 0) return 100
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function averageOrNull(nums: number[]): number | null {
  return nums.length === 0 ? null : average(nums)
}

/**
 * Accuracy and move-quality tally per side. With `positions` (the FEN before each ply), also
 * accuracy per `gamePhase()`; it's opt-in since building positions replays the game.
 */
export function summarizeMoveQuality(
  evals: PositionEval[],
  movesSan: string[],
  initialFen?: string,
  positions?: string[],
): GameAccuracySummary {
  const counts = { white: emptyCounts(), black: emptyCounts() }
  const plies = { white: emptyPlies(), black: emptyPlies() }
  const perMoveAccuracy: { white: number[]; black: number[] } = { white: [], black: [] }
  const byPhase = {
    white: { opening: [], middlegame: [], endgame: [] } as Record<GamePhase, number[]>,
    black: { opening: [], middlegame: [], endgame: [] } as Record<GamePhase, number[]>,
  }

  for (let i = 0; i < movesSan.length; i++) {
    const before = evals[i]
    const after = evals[i + 1]
    if (!before || !after) continue

    const whiteMoved = whiteToMove(i + 1, initialFen)
    const side = whiteMoved ? 'white' : 'black'
    const winBefore = whiteMoved ? evalBarPercent(before) : 100 - evalBarPercent(before)
    const winAfter = whiteMoved ? evalBarPercent(after) : 100 - evalBarPercent(after)

    const accuracy = moveAccuracy(winBefore, winAfter)
    perMoveAccuracy[side].push(accuracy)
    if (positions?.[i]) byPhase[side][gamePhase(positions[i])].push(accuracy)
    const tier = classifyMoveQuality(moveWinDrop(before, after, whiteMoved))
    counts[side][tier]++
    plies[side][tier].push(i + 1)
  }

  const side = (color: 'white' | 'black'): SideAccuracy => ({
    accuracy: average(perMoveAccuracy[color]),
    counts: counts[color],
    plies: plies[color],
    ...(positions && {
      byPhase: {
        opening: averageOrNull(byPhase[color].opening),
        middlegame: averageOrNull(byPhase[color].middlegame),
        endgame: averageOrNull(byPhase[color].endgame),
      },
    }),
  })
  return { white: side('white'), black: side('black') }
}
