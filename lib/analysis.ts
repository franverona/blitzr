import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'
import type { Blunder, PositionEval } from './types'

// A swing at or above this size (in centipawns, from the mover's own
// perspective) counts as a blunder. Mate-losing swings always qualify — see
// evalToCp below.
const BLUNDER_THRESHOLD_CP = 200

export type BlunderSeverity = 'mistake' | 'blunder'

// Blunders are already 200cp+ swings (BLUNDER_THRESHOLD_CP) — this only
// subdivides that same set into two severities for display; it doesn't
// change what counts as a blunder anywhere else (drilling, /blunders totals).
const SEVERE_BLUNDER_THRESHOLD_CP = 400

export function blunderSeverity(swingCp: number): BlunderSeverity {
  return swingCp >= SEVERE_BLUNDER_THRESHOLD_CP ? 'blunder' : 'mistake'
}

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
 *  think in centipawns yet. The Spanish templates all use a "X para {side}"
 *  shape rather than mirroring English's subject-first "{side} is X" one —
 *  keeps every tier grammatical without a per-tier verb conjugation. */
export function describeEval(evaluation: PositionEval, locale: Locale = getLocale()): string {
  const es = locale === 'es'
  if (evaluation.mate !== null) {
    if (es) {
      return evaluation.mate > 0 ? 'Mate forzado para las blancas' : 'Mate forzado para las negras'
    }
    return evaluation.mate > 0 ? 'White has a forced mate' : 'Black has a forced mate'
  }
  const cp = evaluation.cp ?? 0
  if (Math.abs(cp) < 50) return es ? 'Posición igualada' : 'Equal position'
  const side = cp > 0 ? (es ? 'las blancas' : 'White') : es ? 'las negras' : 'Black'
  const abs = Math.abs(cp)
  if (abs < 150) return es ? `Ligera ventaja para ${side}` : `Slight edge for ${side}`
  if (abs < 300) return es ? `Mejor para ${side}` : `${side} is better`
  if (abs < 700) return es ? `Posición ganadora para ${side}` : `${side} is winning`
  return es ? `Posición completamente ganadora para ${side}` : `${side} is completely winning`
}

/**
 * Describes how bad a blunder's swing was, for display next to a blunder
 * list entry. `swingCp` isn't real pawns when a mate score is involved —
 * it's measured against the ±100,000 sentinel `evalToCp` uses internally
 * just to make sure mate swings always cross the blunder threshold — so a
 * mate transition is described in words instead of a bogus "988.1 pawns".
 */
export function formatSwing(blunder: Blunder, locale: Locale = getLocale()): string {
  if (blunder.evalBefore.mate !== null || blunder.evalAfter.mate !== null) {
    return describeEval(blunder.evalAfter, locale).toLowerCase()
  }
  const pawns = (blunder.swingCp / 100).toFixed(1)
  return locale === 'es' ? `${pawns} peones` : `${pawns} pawns`
}
