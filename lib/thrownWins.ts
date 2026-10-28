import { evalBarPercent } from './analysis'
import { formatDate } from './dates'
import type { Game, GameAnalysis, PositionEval, ThrownWin } from './types'

/** The user's win chance (eval bar %) a position must reach to count as won. */
export const WINNING_WIN_PCT = 90

/**
 * Analyzed games the user drew or lost after reaching a winning position, newest first. The
 * peak is the user's best position, the first one if it repeats.
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
      },
    })
  }
  return thrown.sort((a, b) => b.endTime - a.endTime).map((t) => t.win)
}
