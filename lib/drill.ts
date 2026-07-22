import { findBlunders } from './analysis'
import { formatDate } from './dates'
import { buildPositions } from './positions'
import { diffGameAgainstRepertoire } from './repertoire'
import type {
  DrillCard,
  DrillPrompt,
  DrillSourceType,
  Game,
  GameAnalysis,
  RepertoireColor,
  RepertoireNode,
} from './types'

export interface DrillCandidate {
  gameId: string
  sourceType: DrillSourceType
  ply: number
}

/** Whether the given 1-indexed ply was White's move — shared with
 *  `lib/blunders.ts`, which needs the same "own moves only" filter. */
export function whiteToMove(ply: number): boolean {
  return ply % 2 === 1
}

/** Every game currently deviating from the repertoire, at the ply it first
 *  left book — same definition `diffGameAgainstRepertoire` already uses for
 *  "deviation" (the user's own ply, with prepared moves it didn't play). */
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

/** Every analyzed game's blunders, restricted to plies the user actually
 *  played — `findBlunders` walks the whole game including the opponent's
 *  mistakes, which aren't useful to drill ("what should you have played"
 *  only makes sense for your own moves). */
export function findBlunderCandidates(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
): DrillCandidate[] {
  const candidates: DrillCandidate[] = []
  for (const game of games) {
    if (!game.movesSan) continue
    const analysis = analysesByGameId.get(game.id)
    if (!analysis) continue
    for (const blunder of findBlunders(analysis.evals, game.movesSan)) {
      const isMine = whiteToMove(blunder.ply) === (game.myColor === 'white')
      if (isMine) candidates.push({ gameId: game.id, sourceType: 'blunder', ply: blunder.ply })
    }
  }
  return candidates
}

/**
 * Hydrates a stored card (identified only by game/source/ply) into what a
 * drill session actually needs to show — the FEN and the accepted move(s)
 * are re-derived from the source data rather than duplicated in storage.
 * Returns null if the card no longer matches its source (e.g. the
 * repertoire changed) — callers should treat that as "prune this card",
 * which is exactly what the deck sync step does.
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
      gameLabel,
      opponentUsername: opponent,
      opponentAvatarUrl: null,
    }
  }

  const analysis = analysesByGameId.get(game.id)
  const bestMove = analysis
    ? findBlunders(analysis.evals, game.movesSan).find((b) => b.ply === card.ply)?.evalBefore
        .bestMove
    : undefined
  if (!bestMove) return null
  return {
    gameId: game.id,
    sourceType: 'blunder',
    ply: card.ply,
    fen,
    color,
    correctMoves: [bestMove.san],
    gameLabel,
    opponentUsername: opponent,
    opponentAvatarUrl: null,
  }
}

const NEW_CARD_EASE_FACTOR = 2.5
const MIN_EASE_FACTOR = 1.3

/** Default schedule for a card that's never been reviewed — due immediately. */
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

/**
 * SM-2 (the algorithm behind Anki/SuperMemo), simplified to binary grading
 * — "correct"/"incorrect" rather than a 0-5 recall quality — since a drill
 * card here is "did you find the move," not free recall.
 */
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
