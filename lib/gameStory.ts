import { evalBarPercent, moveWinDrop, whiteToMove } from './analysis'
import { gameEndBadges, type GameEndReason } from './gameEnd'
import { gamePhase, type GamePhase } from './material'
import { classifyMoveQuality, summarizeMoveQuality } from './moveQuality'
import { detectBlunderReason } from './tactics'
import { WINNING_WIN_PCT } from './thrownWins'
import type { BlunderReason, MyColor, PositionEval } from './types'

/** How the position stood for the user, coarser than an eval so it reads as words. */
export type Standing = 'winning' | 'better' | 'equal' | 'worse' | 'losing'

export function standingFor(evaluation: PositionEval, myColor: MyColor): Standing {
  const pct = myColor === 'white' ? evalBarPercent(evaluation) : 100 - evalBarPercent(evaluation)
  if (pct >= WINNING_WIN_PCT) return 'winning'
  if (pct >= 60) return 'better'
  if (pct > 40) return 'equal'
  if (pct > 100 - WINNING_WIN_PCT) return 'worse'
  return 'losing'
}

export interface TurningPoint {
  ply: number
  san: string
  mine: boolean
  tier: 'mistake' | 'blunder'
  before: Standing
  after: Standing
  reason: BlunderReason | null
  /** The engine's move instead, if it differs. */
  bestSan: string | null
  /** The user's move right after an opponent's turning point, giving it back. */
  missedChance: boolean
}

export interface GameStory {
  /** The standing once the opening phase was over; null if the game never left it. */
  afterOpening: { ply: number; standing: Standing } | null
  turningPoints: TurningPoint[]
  /** The user's best winning position, when the game wasn't won anyway. */
  slippedWin: { ply: number } | null
  finalStanding: Standing
  accuracy: { mine: number | null; theirs: number | null }
  byPhase: Record<GamePhase, number | null>
  /** How the game ended, from the loser's badge (or the draw's). */
  endReason: GameEndReason | null
}

/**
 * The facts behind a plain-words summary of an analyzed game. Turning points are mistakes and
 * blunders (either side) that changed the standing, so a slip that stays winning isn't one.
 * `positions` is buildPositions()'s: index i before movesSan[i], last one the final position.
 */
export function buildGameStory(
  evals: PositionEval[],
  movesSan: string[],
  positions: string[],
  myColor: MyColor,
  won: boolean,
  finalResults?: { white: string; black: string },
): GameStory {
  const initialFen = positions[0]
  const turningPoints: TurningPoint[] = []
  for (let i = 0; i < movesSan.length; i++) {
    const before = evals[i]
    const after = evals[i + 1]
    if (!before || !after) continue
    const whiteMoved = whiteToMove(i + 1, initialFen)
    const tier = classifyMoveQuality(moveWinDrop(before, after, whiteMoved))
    if (tier !== 'mistake' && tier !== 'blunder') continue
    const standingBefore = standingFor(before, myColor)
    const standingAfter = standingFor(after, myColor)
    if (standingBefore === standingAfter) continue
    const mover: MyColor = whiteMoved ? 'white' : 'black'
    const mine = mover === myColor
    const previous = turningPoints.at(-1)
    turningPoints.push({
      ply: i + 1,
      san: movesSan[i],
      mine,
      tier,
      before: standingBefore,
      after: standingAfter,
      reason: positions[i + 1] ? detectBlunderReason(positions[i], positions[i + 1], mover) : null,
      bestSan: before.bestMove && before.bestMove.san !== movesSan[i] ? before.bestMove.san : null,
      missedChance: mine && previous !== undefined && !previous.mine && previous.ply === i,
    })
  }

  const openingEnd = positions.findIndex((fen) => gamePhase(fen) !== 'opening')
  const afterOpening =
    openingEnd > 0 && evals[openingEnd]
      ? { ply: openingEnd, standing: standingFor(evals[openingEnd], myColor) }
      : null

  const mineOf = (e: PositionEval) =>
    myColor === 'white' ? evalBarPercent(e) : 100 - evalBarPercent(e)
  let peak = 0
  evals.forEach((e, i) => {
    if (mineOf(e) > mineOf(evals[peak])) peak = i
  })
  const slippedWin =
    !won && evals.length > 0 && mineOf(evals[peak]) >= WINNING_WIN_PCT ? { ply: peak } : null

  const summary = summarizeMoveQuality(evals, movesSan, initialFen, positions)
  const me = myColor === 'white' ? summary.white : summary.black
  const them = myColor === 'white' ? summary.black : summary.white

  const finalFen = positions[movesSan.length]
  const badges = finalFen ? gameEndBadges(finalFen, finalResults) : []
  const endReason = (badges.find((b) => b.variant !== 'win') ?? null)?.reason ?? null

  return {
    afterOpening,
    turningPoints,
    slippedWin,
    finalStanding: standingFor(evals.at(-1) ?? { cp: 0, mate: null, bestMove: null }, myColor),
    accuracy: { mine: me.accuracy, theirs: them.accuracy },
    byPhase: me.byPhase ?? { opening: null, middlegame: null, endgame: null },
    endReason,
  }
}
