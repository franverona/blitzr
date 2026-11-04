import { evalBarPercent, moveWinDrop, whiteToMove } from './analysis'
import { formatDate } from './dates'
import type { Game, GameAnalysis, PositionEval, ThrownWin } from './types'

/** The user's win chance (eval bar %) a position must reach to count as won. */
export const WINNING_WIN_PCT = 90

/**
 * Analyzed games the user drew or lost after reaching a winning position, newest first. The
 * peak is the user's best position, the first one if it repeats; the throw is the user's own move
 * after it that lost the most win chance (the first if tied), null if none lost any.
 */
export function findThrownWins(
  games: Game[],
  analysesByGameId: Map<string, GameAnalysis>,
): ThrownWin[] {
  const thrown: { endTime: number; win: ThrownWin }[] = []
  for (const game of games) {
    if (game.myResult === 'win' || !game.movesSan) continue
    const evals = analysesByGameId.get(game.id)?.evals
    if (!evals) continue
    const mine = (e: PositionEval) =>
      game.myColor === 'white' ? evalBarPercent(e) : 100 - evalBarPercent(e)
    let peakPly = 0
    evals.forEach((e, i) => {
      if (mine(e) > mine(evals[peakPly])) peakPly = i
    })
    if (mine(evals[peakPly]) < WINNING_WIN_PCT) continue
    let throwPly: number | null = null
    let worstDrop = 0
    for (let ply = peakPly + 1; ply < evals.length; ply++) {
      const whiteMoved = whiteToMove(ply, game.initialFen)
      if (whiteMoved !== (game.myColor === 'white')) continue
      const drop = moveWinDrop(evals[ply - 1], evals[ply], whiteMoved)
      if (drop > worstDrop) {
        worstDrop = drop
        throwPly = ply
      }
    }
    const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername
    thrown.push({
      endTime: game.endTime,
      win: {
        gameId: game.id,
        gameLabel: `vs ${opponent} · ${formatDate(game.endTime)}`,
        initialFen: game.initialFen,
        result: game.myResult,
        peakPly,
        moveSan: peakPly > 0 ? (game.movesSan[peakPly - 1] ?? null) : null,
        peakEval: evals[peakPly],
        throwPly,
        throwSan: throwPly === null ? null : (game.movesSan[throwPly - 1] ?? null),
      },
    })
  }
  return thrown.sort((a, b) => b.endTime - a.endTime).map((t) => t.win)
}
