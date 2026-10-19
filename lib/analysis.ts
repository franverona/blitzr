import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'
import type { Blunder, PositionEval } from './types'

export type BlunderSeverity = 'mistake' | 'blunder'

/** Mover's win % lost by dropping `cp` from an equal position. Thresholds are
 *  win-% based so the same cp loss in a won position counts for far less. */
export function winDropFromEqual(cp: number): number {
  return evalBarPercent({ cp, mate: null, bestMove: null }) - 50
}

export const BLUNDER_THRESHOLD_WIN_DROP = winDropFromEqual(200)

// Display-only split of blunders into mistake/blunder.
const SEVERE_BLUNDER_THRESHOLD_WIN_DROP = winDropFromEqual(400)

export function blunderSeverity(winDrop: number): BlunderSeverity {
  return winDrop >= SEVERE_BLUNDER_THRESHOLD_WIN_DROP ? 'blunder' : 'mistake'
}

// Mate is mapped to a large value so swings keep the winning side; only used
// for display, never for thresholds.
function evalToCp(evaluation: PositionEval): number {
  if (evaluation.mate !== null) return evaluation.mate > 0 ? 100_000 : -100_000
  return evaluation.cp ?? 0
}

/** Centipawns the mover lost with this move (positive = worse for them). */
export function moveSwingCp(
  before: PositionEval,
  after: PositionEval,
  whiteToMove: boolean,
): number {
  const moverBefore = whiteToMove ? evalToCp(before) : -evalToCp(before)
  const moverAfter = whiteToMove ? evalToCp(after) : -evalToCp(after)
  return moverBefore - moverAfter
}

/** Win % (0-100) the mover lost with this move (positive = worse for them). */
export function moveWinDrop(
  before: PositionEval,
  after: PositionEval,
  whiteToMove: boolean,
): number {
  const drop = evalBarPercent(before) - evalBarPercent(after)
  return whiteToMove ? drop : -drop
}

/**
 * Whether the 1-indexed ply was White's move. A custom starting FEN can have
 * Black move first.
 */
export function whiteToMove(ply: number, initialFen?: string): boolean {
  const whiteMovesFirst = initialFen?.split(' ')[1] !== 'b'
  return (ply % 2 === 1) === whiteMovesFirst
}

/** evals[i] is before movesSan[i], evals[i+1] after (White's perspective). */
export function findBlunders(
  evals: PositionEval[],
  movesSan: string[],
  initialFen?: string,
): Blunder[] {
  const blunders: Blunder[] = []

  for (let i = 0; i < movesSan.length; i++) {
    const before = evals[i]
    const after = evals[i + 1]
    if (!before || !after) continue

    const whiteMoved = whiteToMove(i + 1, initialFen)
    const winDrop = moveWinDrop(before, after, whiteMoved)

    if (winDrop >= BLUNDER_THRESHOLD_WIN_DROP) {
      blunders.push({
        ply: i + 1,
        moveSan: movesSan[i],
        evalBefore: before,
        evalAfter: after,
        swingCp: moveSwingCp(before, after, whiteMoved),
        winDrop,
      })
    }
  }

  return blunders
}

export function biggestBlunder(blunders: Blunder[]): Blunder | null {
  if (blunders.length === 0) return null
  return blunders.reduce((worst, b) => (b.winDrop > worst.winDrop ? b : worst))
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

/** White's share of the eval bar, 0-100, using Lichess's win-chance curve. */
export function evalBarPercent(evaluation: PositionEval): number {
  if (evaluation.mate !== null) return evaluation.mate > 0 ? 99 : 1
  const winChances = 2 / (1 + Math.exp(-0.00368208 * (evaluation.cp ?? 0))) - 1
  return ((winChances + 1) / 2) * 100
}

/** Plain-language eval, e.g. "White is winning". */
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

/** Mate swings are measured against `evalToCp`'s sentinel, so they're
 *  described in words instead of a bogus pawn count. */
export function formatSwing(blunder: Blunder, locale: Locale = getLocale()): string {
  if (blunder.evalBefore.mate !== null || blunder.evalAfter.mate !== null) {
    return describeEval(blunder.evalAfter, locale).toLowerCase()
  }
  const pawns = (blunder.swingCp / 100).toFixed(1)
  return locale === 'es' ? `${pawns} peones` : `${pawns} pawns`
}
