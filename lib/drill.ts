import { findBlunders, whiteToMove } from './analysis'
import { summarizeMoveQuality } from './moveQuality'
export { whiteToMove }
import { formatDate } from './dates'
import { buildPositions } from './positions'
import { diffGameAgainstRepertoire } from './repertoire'
import type {
  DrillCard,
  DrillPrompt,
  DrillSourceType,
  Game,
  GameAnalysis,
  PositionEval,
  RepertoireColor,
  RepertoireNode,
} from './types'

export interface DrillCandidate {
  gameId: string
  sourceType: DrillSourceType
  ply: number
}

/** Each game's first deviation from the repertoire. */
export function findDeviationCandidates(
  games: Game[],
  repertoireByColor: Map<RepertoireColor, RepertoireNode[]>,
): DrillCandidate[] {
  const candidates: DrillCandidate[] = []
  for (const game of games) {
    if (!game.movesSan) continue
    const nodes = repertoireByColor.get(game.myColor) ?? []
    if (nodes.length === 0) continue
    const diff = diffGameAgainstRepertoire(game.movesSan, game.myColor, nodes)
    if (diff.deviationPly !== null) {
      candidates.push({ gameId: game.id, sourceType: 'deviation', ply: diff.deviationPly })
    }
  }
  return candidates
}

/** Blunders on the user's own plies only. */
export function findBlunderCandidates(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
): DrillCandidate[] {
  const candidates: DrillCandidate[] = []
  for (const game of games) {
    if (!game.movesSan) continue
    const analysis = analysesByGameId.get(game.id)
    if (!analysis) continue
    for (const blunder of findBlunders(analysis.evals, game.movesSan, game.initialFen)) {
      const isMine = whiteToMove(blunder.ply, game.initialFen) === (game.myColor === 'white')
      if (isMine) candidates.push({ gameId: game.id, sourceType: 'blunder', ply: blunder.ply })
    }
  }
  return candidates
}

/**
 * Re-derives a stored card's FEN and accepted moves from source data.
 * Returns null if the card no longer matches its source, so it gets pruned.
 */
export function buildDrillPrompt(
  card: Pick<DrillCard, 'gameId' | 'sourceType' | 'ply'>,
  game: Game,
  repertoireByColor: Map<RepertoireColor, RepertoireNode[]>,
  analysesByGameId: Map<string, GameAnalysis>,
): DrillPrompt | null {
  if (!game.movesSan) return null
  const fen = buildPositions(game.initialFen, game.movesSan)[card.ply - 1]
  if (!fen) return null

  const color = game.myColor
  const opponent = color === 'white' ? game.blackUsername : game.whiteUsername
  const gameLabel = `vs ${opponent} · ${formatDate(game.endTime)}`

  if (card.sourceType === 'deviation') {
    const nodes = repertoireByColor.get(color) ?? []
    const diff = diffGameAgainstRepertoire(game.movesSan, color, nodes)
    if (diff.deviationPly !== card.ply || !diff.expectedMoves) return null
    return {
      gameId: game.id,
      sourceType: 'deviation',
      ply: card.ply,
      fen,
      color,
      correctMoves: diff.expectedMoves,
      evalBefore: null,
      gameLabel,
      opponentUsername: opponent,
      opponentAvatarUrl: null,
    }
  }

  const analysis = analysesByGameId.get(game.id)
  const evalBefore = analysis
    ? findBlunders(analysis.evals, game.movesSan, game.initialFen).find((b) => b.ply === card.ply)
        ?.evalBefore
    : undefined
  const bestMove = evalBefore?.bestMove
  if (!evalBefore || !bestMove) return null
  return {
    gameId: game.id,
    sourceType: 'blunder',
    ply: card.ply,
    fen,
    color,
    correctMoves: [bestMove.san],
    evalBefore,
    gameLabel,
    opponentUsername: opponent,
    opponentAvatarUrl: null,
  }
}

/** Whether a move other than the engine's still passes a blunder card: it must
 *  rate "good" or better, not merely avoid being a blunder. */
export function isNearBestMove(
  fenBefore: string,
  evalBefore: PositionEval,
  evalAfter: PositionEval,
): boolean {
  const summary = summarizeMoveQuality([evalBefore, evalAfter], ['?'], fenBefore)
  const { best, excellent, good } =
    fenBefore.split(' ')[1] === 'b' ? summary.black.counts : summary.white.counts
  return best + excellent + good > 0
}

const NEW_CARD_EASE_FACTOR = 2.5
const MIN_EASE_FACTOR = 1.3

/** Cards per drill session, picked in settings. */
export const SESSION_SIZES = [10, 15, 25] as const
export type SessionSize = (typeof SESSION_SIZES)[number]
export const DEFAULT_SESSION_SIZE: SessionSize = 15

export function getSessionSize(raw: string | undefined): SessionSize {
  const n = Number(raw)
  return SESSION_SIZES.find((size) => size === n) ?? DEFAULT_SESSION_SIZE
}

/** The `max` most-overdue cards. ISO `dueAt` strings sort chronologically. */
export function selectSessionCards(
  dueCards: DrillCard[],
  max: number = DEFAULT_SESSION_SIZE,
): DrillCard[] {
  return [...dueCards].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, max)
}

export function newCardSchedule(
  now: Date,
): Pick<DrillCard, 'dueAt' | 'intervalDays' | 'easeFactor' | 'repetitions' | 'lastReviewedAt'> {
  return {
    dueAt: now.toISOString(),
    intervalDays: 0,
    easeFactor: NEW_CARD_EASE_FACTOR,
    repetitions: 0,
    lastReviewedAt: null,
  }
}

/** SM-2 with binary (correct/incorrect) grading. */
export function scheduleReview(
  current: { intervalDays: number; easeFactor: number; repetitions: number },
  correct: boolean,
  now: Date,
): Pick<DrillCard, 'dueAt' | 'intervalDays' | 'easeFactor' | 'repetitions' | 'lastReviewedAt'> {
  let { intervalDays, easeFactor, repetitions } = current

  if (correct) {
    repetitions += 1
    intervalDays =
      repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(intervalDays * easeFactor)
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + 0.1)
  } else {
    repetitions = 0
    intervalDays = 1
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2)
  }

  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString()
  return { dueAt, intervalDays, easeFactor, repetitions, lastReviewedAt: now.toISOString() }
}
