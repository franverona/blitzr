import { findBlunders, moveWinDrop, whiteToMove } from './analysis'
import { classifyMoveQuality } from './moveQuality'
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

/**
 * Each game's first deviation from the repertoire, one card per position: games that
 * left the tree at the same point share a prompt, so only one gets the card. A game
 * that already has the card keeps it (an older game pasted later would otherwise reset
 * its schedule); otherwise the oldest wins.
 */
export function findDeviationCandidates(
  games: Game[],
  repertoireByColor: Map<RepertoireColor, RepertoireNode[]>,
  existingCards: DrillCard[] = [],
): DrillCandidate[] {
  const hasCard = new Set(
    existingCards.filter((c) => c.sourceType === 'deviation').map((c) => `${c.gameId}:${c.ply}`),
  )
  const owns = (c: { game: Game; ply: number }) => hasCard.has(`${c.game.id}:${c.ply}`)
  const better = (a: { game: Game; ply: number }, b: { game: Game; ply: number }) =>
    owns(a) !== owns(b)
      ? owns(a)
      : a.game.endTime !== b.game.endTime
        ? a.game.endTime < b.game.endTime
        : a.game.id < b.game.id
  const byPosition = new Map<string, { game: Game; ply: number }>()
  for (const game of games) {
    if (!game.movesSan) continue
    const nodes = repertoireByColor.get(game.myColor) ?? []
    if (nodes.length === 0) continue
    const { deviationPly } = diffGameAgainstRepertoire(game.movesSan, game.myColor, nodes)
    if (deviationPly === null) continue
    const key = `${game.myColor}:${game.movesSan.slice(0, deviationPly - 1).join(' ')}`
    const candidate = { game, ply: deviationPly }
    const kept = byPosition.get(key)
    if (!kept || better(candidate, kept)) byPosition.set(key, candidate)
  }
  return [...byPosition.values()].map(({ game, ply }) => ({
    gameId: game.id,
    sourceType: 'deviation',
    ply,
  }))
}

/**
 * Blunders on the user's own plies only. Missing the same best move on consecutive
 * own plies (a piece left en prise for several moves) is one card, the first miss.
 */
export function findBlunderCandidates(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
): DrillCandidate[] {
  const candidates: DrillCandidate[] = []
  for (const game of games) {
    if (!game.movesSan) continue
    const analysis = analysesByGameId.get(game.id)
    if (!analysis) continue
    let previous: { ply: number; bestSan: string | undefined } | null = null
    for (const blunder of findBlunders(analysis.evals, game.movesSan, game.initialFen)) {
      const isMine = whiteToMove(blunder.ply, game.initialFen) === (game.myColor === 'white')
      // buildDrillPrompt() can't make a card without the engine's move; one would sit
      // in the deck forever, taking a session slot.
      const bestSan = blunder.evalBefore.bestMove?.san
      if (!isMine || !bestSan) continue
      const repeat = previous?.ply === blunder.ply - 2 && bestSan && previous.bestSan === bestSan
      previous = { ply: blunder.ply, bestSan }
      if (!repeat) candidates.push({ gameId: game.id, sourceType: 'blunder', ply: blunder.ply })
    }
  }
  return candidates
}

/**
 * The user's replies to an opponent's blunder that weren't near-best (`isNearBestMove()`), so the
 * mistake went unpunished. A reply that was itself a blunder is left to its blunder card.
 */
export function findPunishCandidates(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
): DrillCandidate[] {
  const candidates: DrillCandidate[] = []
  for (const game of games) {
    if (!game.movesSan) continue
    const analysis = analysesByGameId.get(game.id)
    if (!analysis) continue
    const blunders = findBlunders(analysis.evals, game.movesSan, game.initialFen)
    const blunderPlies = new Set(blunders.map((b) => b.ply))
    for (const blunder of blunders) {
      const theirs = whiteToMove(blunder.ply, game.initialFen) !== (game.myColor === 'white')
      const reply = blunder.ply + 1
      if (!theirs || reply > game.movesSan.length || blunderPlies.has(reply)) continue
      const evalBefore = analysis.evals[reply - 1]
      if (!evalBefore?.bestMove) continue
      const evalAfter = analysis.evals[reply]
      if (evalAfter && isNearBestMove(game.myColor === 'white', evalBefore, evalAfter)) continue
      candidates.push({ gameId: game.id, sourceType: 'punish', ply: reply })
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
  const evalBefore =
    card.sourceType === 'punish'
      ? findPunishCandidates([game], analysesByGameId).some((c) => c.ply === card.ply)
        ? analysis?.evals[card.ply - 1]
        : undefined
      : analysis
        ? findBlunders(analysis.evals, game.movesSan, game.initialFen).find(
            (b) => b.ply === card.ply,
          )?.evalBefore
        : undefined
  const bestMove = evalBefore?.bestMove
  if (!evalBefore || !bestMove) return null
  return {
    gameId: game.id,
    sourceType: card.sourceType,
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
  whiteMoved: boolean,
  evalBefore: PositionEval,
  evalAfter: PositionEval,
): boolean {
  const tier = classifyMoveQuality(moveWinDrop(evalBefore, evalAfter, whiteMoved))
  return tier === 'best' || tier === 'excellent' || tier === 'good'
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

function cardKey(c: DrillCandidate): string {
  return `${c.gameId}:${c.sourceType}:${c.ply}`
}

/** Matches stored cards to today's candidates: cards whose ply no longer
 *  qualifies are stale, unseen candidates are added with a fresh schedule. */
export function reconcileDrillDeck(
  existing: DrillCard[],
  candidates: DrillCandidate[],
  now: Date,
): { live: DrillCard[]; stale: DrillCard[]; added: DrillCard[] } {
  const candidateKeys = new Set(candidates.map(cardKey))
  const existingKeys = new Set(existing.map(cardKey))
  const added = candidates
    .filter((c) => !existingKeys.has(cardKey(c)))
    .map((c) => ({ ...c, ...newCardSchedule(now), createdAt: now.toISOString() }))
  return {
    live: [...existing.filter((c) => candidateKeys.has(cardKey(c))), ...added],
    stale: existing.filter((c) => !candidateKeys.has(cardKey(c))),
    added,
  }
}

/** Cards due by `now` that pass the /drill filters. `openingOf` returns
 *  undefined for a card whose game is gone, which fails an opening filter. */
export function dueDrillCards(
  cards: DrillCard[],
  now: Date,
  filters: { sourceType?: DrillSourceType; opening?: string } | undefined,
  openingOf: (gameId: string) => string | undefined,
): DrillCard[] {
  const nowIso = now.toISOString()
  return cards.filter(
    (c) =>
      c.dueAt <= nowIso &&
      (!filters?.sourceType || c.sourceType === filters.sourceType) &&
      (!filters?.opening || openingOf(c.gameId) === filters.opening),
  )
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

  // Due from the start of that local day, so a card missed in the evening is in the
  // next morning's session ("tomorrow") rather than 24 hours later.
  const due = new Date(now)
  due.setDate(due.getDate() + intervalDays)
  due.setHours(0, 0, 0, 0)
  return {
    dueAt: due.toISOString(),
    intervalDays,
    easeFactor,
    repetitions,
    lastReviewedAt: now.toISOString(),
  }
}
