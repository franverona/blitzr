import { findBlunders } from './analysis'
import { formatDate } from './dates'
import { whiteToMove } from './drill'
import { ecoFamilyLabel } from './openings'
import { buildPositions } from './positions'
import { describeMove, splitSanPiece } from './san'
import { detectBlunderReason } from './tactics'
import type { BlunderGroupStat, BlunderStats, Game, GameAnalysis, WorstBlunder } from './types'

const WORST_LIST_SIZE = 10

/** Pre-description shape collected while walking every game's blunders —
 *  `moveDescription`/`reason` are only computed for the handful that survive
 *  the sort + slice to `WORST_LIST_SIZE`, not for every blunder counted along
 *  the way. */
type BlunderCandidate = Omit<WorstBlunder, 'moveDescription' | 'reason'>

interface GroupAcc {
  label: string
  count: number
  // Only real centipawn swings contribute here — a swing into/out of a mate
  // uses evalToCp's internal ±100,000 sentinel (see lib/analysis.ts), which
  // would blow up an average if mixed in with genuine pawn values. Tracked
  // separately from `count` so the average is still over a meaningful unit.
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

/** The piece that moved, for grouping blunders by piece — pawn moves and
 *  castling have no leading piece letter in SAN, so they get their own
 *  buckets rather than falling through as "unknown". */
function pieceKey(moveSan: string): { key: string; label: string } {
  if (moveSan.startsWith('O-O')) return { key: 'castle', label: 'Castle' }
  const { piece } = splitSanPiece(moveSan)
  if (!piece) return { key: 'pawn', label: 'Pawn' }
  const labels = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }
  return { key: piece, label: labels[piece] }
}

/**
 * Cross-game blunder aggregate, scoped to whatever games already have a
 * saved Stockfish analysis (there's no bulk "analyze everything" job) —
 * mirrors `buildOpeningFamilies` (`lib/openings.ts`): a pure function over
 * already-stored data, no new persistence.
 */
export function buildBlunderStats(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
): BlunderStats {
  const byOpening = new Map<string, GroupAcc>()
  const byPiece = new Map<string, GroupAcc>()
  const worst: BlunderCandidate[] = []
  let analyzedGames = 0
  let totalBlunders = 0

  for (const game of games) {
    if (!game.movesSan) continue
    const analysis = analysesByGameId.get(game.id)
    if (!analysis) continue
    analyzedGames++

    const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername
    const gameLabel = `vs ${opponent} · ${formatDate(game.endTime)}`

    for (const blunder of findBlunders(analysis.evals, game.movesSan)) {
      const isMine = whiteToMove(blunder.ply) === (game.myColor === 'white')
      if (!isMine) continue
      totalBlunders++

      const isMateSwing = blunder.evalBefore.mate !== null || blunder.evalAfter.mate !== null

      const ecoKey = game.ecoCode ?? 'unknown'
      const ecoLabel = game.ecoName ? ecoFamilyLabel(game.ecoName) : 'Unknown opening'
      accumulate(byOpening, ecoKey, ecoLabel, blunder.swingCp, isMateSwing)

      const { key, label } = pieceKey(blunder.moveSan)
      accumulate(byPiece, key, label, blunder.swingCp, isMateSwing)

      worst.push({
        gameId: game.id,
        gameLabel,
        ply: blunder.ply,
        moveSan: blunder.moveSan,
        swingCp: blunder.swingCp,
        evalBefore: blunder.evalBefore,
        evalAfter: blunder.evalAfter,
      })
    }
  }

  worst.sort((a, b) => b.swingCp - a.swingCp)

  const gamesById = new Map(games.map((g) => [g.id, g]))
  const topWorst: WorstBlunder[] = worst.slice(0, WORST_LIST_SIZE).map((entry) => {
    const game = gamesById.get(entry.gameId)
    const positions = game?.movesSan ? buildPositions(game.initialFen, game.movesSan) : null
    return {
      ...entry,
      moveDescription: positions
        ? describeMove(positions[entry.ply - 1], entry.moveSan)
        : entry.moveSan,
      // `worst` entries are already filtered to the account's own moves, so
      // the mover is always `game.myColor` — no parity check needed here.
      reason:
        positions && game
          ? detectBlunderReason(positions[entry.ply - 1], positions[entry.ply], game.myColor)
          : null,
    }
  })

  return {
    totalGames: games.length,
    analyzedGames,
    totalBlunders,
    byOpening: toGroupStats(byOpening),
    byPiece: toGroupStats(byPiece),
    worst: topWorst,
  }
}
