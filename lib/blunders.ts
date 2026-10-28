import type { PieceSymbol } from 'chess.js'
import { findBlunders } from './analysis'
import { formatDate } from './dates'
import { isNearBestMove, whiteToMove } from './drill'
import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'
import { gamePhase, type GamePhase } from './material'
import { ecoFamilyLabel, unknownOpeningLabel } from './openings'
import { buildPositions } from './positions'
import { describeMove, pieceName, splitSanPiece } from './san'
import { describeBetterMove, detectBlunderReason } from './tactics'
import type {
  BlunderGroupStat,
  BlunderReason,
  BlunderStats,
  Game,
  GameAnalysis,
  WorstBlunder,
} from './types'

const WORST_LIST_SIZE = 10

/** Descriptions are only computed for the entries that make the worst list. */
type BlunderCandidate = Omit<WorstBlunder, 'moveDescription' | 'reason' | 'betterMove'>

interface GroupAcc {
  label: string
  count: number
  // Mate swings use a ±100,000 sentinel, so they're excluded from the average.
  swingSum: number
  swingCount: number
}

function accumulate(
  groups: Map<string, GroupAcc>,
  key: string,
  label: string,
  swingCp: number,
  isMateSwing: boolean,
) {
  const existing = groups.get(key) ?? { label, count: 0, swingSum: 0, swingCount: 0 }
  existing.count++
  if (!isMateSwing) {
    existing.swingSum += swingCp
    existing.swingCount++
  }
  groups.set(key, existing)
}

function toGroupStats(groups: Map<string, GroupAcc>): BlunderGroupStat[] {
  return Array.from(groups.entries())
    .map(([key, { label, count, swingSum, swingCount }]) => ({
      key,
      label,
      count,
      avgSwingCp: swingCount > 0 ? swingSum / swingCount : null,
    }))
    .sort((a, b) => b.count - a.count)
}

function pieceKey(moveSan: string, locale: Locale): { key: string; label: string } {
  if (moveSan.startsWith('O-O'))
    return { key: 'castle', label: locale === 'es' ? 'Enroque' : 'Castle' }
  const { piece } = splitSanPiece(moveSan)
  if (!piece) return { key: 'pawn', label: pieceName('p', locale) }
  return { key: piece, label: pieceName(piece.toLowerCase() as PieceSymbol, locale) }
}

const REASON_LABELS: Record<Locale, Record<BlunderReason['kind'] | 'none', string>> = {
  en: {
    'hanging-piece': 'Hanging piece',
    fork: 'Fork',
    pin: 'Pin',
    skewer: 'Skewer',
    none: 'No simple pattern',
  },
  es: {
    'hanging-piece': 'Pieza colgada',
    fork: 'Horquilla',
    pin: 'Clavada',
    skewer: 'Enfilada',
    none: 'Sin patrón simple',
  },
}
const PHASE_LABELS: Record<Locale, Record<GamePhase, string>> = {
  en: { opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame' },
  es: { opening: 'Apertura', middlegame: 'Medio juego', endgame: 'Final' },
}
const PHASE_ORDER: GamePhase[] = ['opening', 'middlegame', 'endgame']

/**
 * Cross-game aggregate of the user's own blunders over analyzed games. The
 * caller merges in `trend`.
 */
export function buildBlunderStats(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
  locale: Locale = getLocale(),
): Omit<BlunderStats, 'trend' | 'thrownWins'> {
  const byOpening = new Map<string, GroupAcc>()
  const byPiece = new Map<string, GroupAcc>()
  const byReason = new Map<string, GroupAcc>()
  const byPhase = new Map<string, GroupAcc>()
  const worst: BlunderCandidate[] = []
  let analyzedGames = 0
  let totalBlunders = 0
  const punish = { chances: 0, punished: 0 }

  for (const game of games) {
    if (!game.movesSan) continue
    const analysis = analysesByGameId.get(game.id)
    if (!analysis) continue
    analyzedGames++

    const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername
    const gameLabel = `vs ${opponent} · ${formatDate(game.endTime)}`
    let positions: string[] | undefined

    for (const blunder of findBlunders(analysis.evals, game.movesSan, game.initialFen)) {
      const isMine = whiteToMove(blunder.ply, game.initialFen) === (game.myColor === 'white')
      if (!isMine) {
        // Same bar as a punish card (findPunishCandidates()); a blunder that ended the game had no reply.
        const replyEval = analysis.evals[blunder.ply + 1]
        if (blunder.ply < game.movesSan.length && replyEval) {
          punish.chances++
          if (isNearBestMove(game.myColor === 'white', blunder.evalAfter, replyEval))
            punish.punished++
        }
        continue
      }
      totalBlunders++

      const isMateSwing = blunder.evalBefore.mate !== null || blunder.evalAfter.mate !== null

      // By name, not ECO code: one family spans several codes, and /drill?opening= (linked
      // from Today's weak spot) filters by this same label.
      const ecoLabel = game.ecoName ? ecoFamilyLabel(game.ecoName) : unknownOpeningLabel(locale)
      accumulate(byOpening, ecoLabel, ecoLabel, blunder.swingCp, isMateSwing)

      const { key, label } = pieceKey(blunder.moveSan, locale)
      accumulate(byPiece, key, label, blunder.swingCp, isMateSwing)

      positions ??= buildPositions(game.initialFen, game.movesSan)
      const reasonKind =
        detectBlunderReason(positions[blunder.ply - 1], positions[blunder.ply], game.myColor)
          ?.kind ?? 'none'
      const reasonLabel = REASON_LABELS[locale][reasonKind]
      accumulate(byReason, reasonKind, reasonLabel, blunder.swingCp, isMateSwing)
      const phase = gamePhase(positions[blunder.ply - 1])
      accumulate(byPhase, phase, PHASE_LABELS[locale][phase], blunder.swingCp, isMateSwing)

      worst.push({
        gameId: game.id,
        gameLabel,
        initialFen: game.initialFen,
        ply: blunder.ply,
        moveSan: blunder.moveSan,
        swingCp: blunder.swingCp,
        winDrop: blunder.winDrop,
        evalBefore: blunder.evalBefore,
        evalAfter: blunder.evalAfter,
      })
    }
  }

  worst.sort((a, b) => b.winDrop - a.winDrop)

  const gamesById = new Map(games.map((g) => [g.id, g]))
  const topWorst: WorstBlunder[] = worst.slice(0, WORST_LIST_SIZE).map((entry) => {
    const game = gamesById.get(entry.gameId)
    const positions = game?.movesSan ? buildPositions(game.initialFen, game.movesSan) : null
    return {
      ...entry,
      moveDescription: positions
        ? describeMove(positions[entry.ply - 1], entry.moveSan, locale)
        : entry.moveSan,
      // `worst` only holds the user's own moves.
      reason:
        positions && game
          ? detectBlunderReason(positions[entry.ply - 1], positions[entry.ply], game.myColor)
          : null,
      betterMove:
        positions && game
          ? describeBetterMove(
              positions[entry.ply - 1],
              entry.moveSan,
              entry.evalBefore.bestMove,
              game.myColor,
              locale,
            )
          : null,
    }
  })

  return {
    totalGames: games.length,
    analyzedGames,
    totalBlunders,
    punish,
    byOpening: toGroupStats(byOpening),
    byPiece: toGroupStats(byPiece),
    byReason: toGroupStats(byReason),
    // Game order, not count order: the point is where in the game they happen.
    byPhase: toGroupStats(byPhase).sort(
      (a, b) => PHASE_ORDER.indexOf(a.key as GamePhase) - PHASE_ORDER.indexOf(b.key as GamePhase),
    ),
    worst: topWorst,
  }
}
