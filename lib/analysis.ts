import type { Blunder, PositionEval } from './types'

// A swing at or above this size (in centipawns, from the mover's own
// perspective) counts as a blunder. Mate-losing swings always qualify — see
// evalToCp below.
const BLUNDER_THRESHOLD_CP = 200

// Mate scores aren't directly comparable to centipawns, so they're mapped to
// a value large enough that any swing into or out of a mate always crosses
// the blunder threshold, while still preserving which side is winning.
function evalToCp(evaluation: PositionEval): number {
  if (evaluation.mate !== null) return evaluation.mate > 0 ? 100_000 : -100_000
  return evaluation.cp ?? 0
}

/**
 * Walks a game's per-position evals (White's perspective, same indexing as
 * the positions array — evals[i] is before movesSan[i], evals[i+1] after)
 * and flags every move where the player who just moved made their own
 * position significantly worse.
 */
export function findBlunders(evals: PositionEval[], movesSan: string[]): Blunder[] {
  const blunders: Blunder[] = []

  for (let i = 0; i < movesSan.length; i++) {
    const before = evals[i]
    const after = evals[i + 1]
    if (!before || !after) continue

    const whiteToMove = i % 2 === 0
    const moverBefore = whiteToMove ? evalToCp(before) : -evalToCp(before)
    const moverAfter = whiteToMove ? evalToCp(after) : -evalToCp(after)
    const swingCp = moverBefore - moverAfter

    if (swingCp >= BLUNDER_THRESHOLD_CP) {
      blunders.push({
        ply: i + 1,
        moveSan: movesSan[i],
        evalBefore: before,
        evalAfter: after,
        swingCp,
      })
    }
  }

  return blunders
}

/** The single worst blunder in a game, if any. */
export function biggestBlunder(blunders: Blunder[]): Blunder | null {
  if (blunders.length === 0) return null
  return blunders.reduce((worst, b) => (b.swingCp > worst.swingCp ? b : worst))
}

/** Formats an eval for display, e.g. "+1.4", "-0.3", "M3", "-M2". */
export function formatEval(evaluation: PositionEval): string {
  if (evaluation.mate !== null) {
    return evaluation.mate > 0 ? `M${evaluation.mate}` : `-M${Math.abs(evaluation.mate)}`
  }
  const pawns = (evaluation.cp ?? 0) / 100
  const sign = pawns > 0 ? '+' : ''
  return `${sign}${pawns.toFixed(1)}`
}

/**
 * How much of an eval bar White's fill should cover, 0-100. Uses the same
 * logistic curve Lichess uses to turn centipawns into win chances, so the
 * bar reads intuitively — a +1 pawn edge looks like a real but modest edge,
 * +8 looks all but decided — instead of a raw linear centipawn scale where
 * +30 and +10 would look nearly identical.
 */
export function evalBarPercent(evaluation: PositionEval): number {
  if (evaluation.mate !== null) return evaluation.mate > 0 ? 99 : 1
  const winChances = 2 / (1 + Math.exp(-0.00368208 * (evaluation.cp ?? 0))) - 1
  return ((winChances + 1) / 2) * 100
}

/** A plain-language read of an eval, e.g. "White is winning", for anyone who doesn't
 * think in centipawns yet. */
export function describeEval(evaluation: PositionEval): string {
  if (evaluation.mate !== null) {
    return evaluation.mate > 0 ? 'White has a forced mate' : 'Black has a forced mate'
  }
  const cp = evaluation.cp ?? 0
  if (Math.abs(cp) < 50) return 'Equal position'
  const side = cp > 0 ? 'White' : 'Black'
  const abs = Math.abs(cp)
  if (abs < 150) return `Slight edge for ${side}`
  if (abs < 300) return `${side} is better`
  if (abs < 700) return `${side} is winning`
  return `${side} is completely winning`
}
