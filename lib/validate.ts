import { Chess } from 'chess.js'
import type { PositionEval, RepertoireNode } from './types'

// Server Actions are plain POST endpoints, so their arguments are untrusted.

const isNumberOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))
const isString = (v: unknown) => typeof v === 'string'

function isPositionEval(v: unknown): v is PositionEval {
  if (typeof v !== 'object' || v === null) return false
  const { cp, mate, bestMove } = v as Record<string, unknown>
  if (!isNumberOrNull(cp) || !isNumberOrNull(mate)) return false
  if (bestMove === null) return true
  if (typeof bestMove !== 'object') return false
  const { from, to, san, bestLine } = bestMove as Record<string, unknown>
  return (
    isString(from) &&
    isString(to) &&
    isString(san) &&
    Array.isArray(bestLine) &&
    bestLine.every(isString)
  )
}

/** One well-formed eval per position: the start plus one per move. */
export function isValidAnalysis(evals: unknown, moveCount: number, movetimeMs: unknown): boolean {
  return (
    Array.isArray(evals) &&
    evals.length === moveCount + 1 &&
    evals.every(isPositionEval) &&
    typeof movetimeMs === 'number' &&
    Number.isInteger(movetimeMs) &&
    movetimeMs > 0
  )
}

export function isValidDrillAnswer(
  gameId: unknown,
  sourceType: unknown,
  ply: unknown,
  correct: unknown,
): boolean {
  return (
    isString(gameId) &&
    (sourceType === 'deviation' || sourceType === 'blunder' || sourceType === 'punish') &&
    typeof ply === 'number' &&
    Number.isInteger(ply) &&
    ply > 0 &&
    typeof correct === 'boolean'
  )
}

const isIsoDate = (v: unknown) => isString(v) && !Number.isNaN(Date.parse(v))
const isCount = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0

/** A schedule `submitDrillAnswer()` returned, sent back to undo that answer. */
export function isValidDrillUndo(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false
  const { previous, reviewedAt } = v as Record<string, unknown>
  if (!isIsoDate(reviewedAt) || typeof previous !== 'object' || previous === null) return false
  const { dueAt, intervalDays, easeFactor, repetitions, lastReviewedAt } = previous as Record<
    string,
    unknown
  >
  return (
    isIsoDate(dueAt) &&
    isCount(intervalDays) &&
    isCount(repetitions) &&
    typeof easeFactor === 'number' &&
    Number.isFinite(easeFactor) &&
    easeFactor > 0 &&
    (lastReviewedAt === null || isIsoDate(lastReviewedAt))
  )
}

/**
 * The node as the server will store it: its move must be legal from `parent`
 * (or the start), and the SAN and FEN are re-derived rather than trusted.
 * Returns null for anything else.
 */
export function normalizeRepertoireNode(
  node: RepertoireNode,
  parent: RepertoireNode | undefined,
): RepertoireNode | null {
  if (node.color !== 'white' && node.color !== 'black') return null
  if (!isString(node.id) || !isString(node.moveSan)) return null
  if (parent ? parent.color !== node.color : node.parentId !== null) return null
  if (node.ply !== (parent?.ply ?? 0) + 1) return null

  const chess = parent ? new Chess(parent.fen) : new Chess()
  try {
    const move = chess.move(node.moveSan)
    return { ...node, moveSan: move.san, fen: chess.fen(), createdAt: new Date().toISOString() }
  } catch {
    return null
  }
}
