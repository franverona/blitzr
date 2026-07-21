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
