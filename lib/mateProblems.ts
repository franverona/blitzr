// Mate-in-N puzzle type and client-safe helpers. The puzzles themselves load
// server-side from lib/puzzleSet.ts, so client components importing this file
// don't ship them to the browser.
import { getStrings } from './i18n/strings'

export interface MateProblem {
  id: number
  /** Position with the side to move about to force mate. */
  fen: string
  /** Full solution in SAN, starting with the solver's key move. */
  moves: string[]
  /** Counted in the solver's own moves. */
  mateIn: number
  title: string
  /** '' for real games and Lichess puzzles, 'László Polgár' for the local Polgár set. */
  composer: string
  source: string
  year: string
  /** Full solution line, shown after solving or on "reveal". */
  solution: string
  /** Lichess puzzle rating, when the puzzle comes from Lichess. */
  rating?: number
  /** Where the puzzle can be played or credited online (Lichess puzzles). */
  url?: string
  /**
   * Set on defence puzzles: every move that stops the opponent's mate in
   * `mateIn` or fewer. Then `fen` has the defender to move, and `moves` is
   * the game's losing move followed by the mate it allowed.
   */
  saves?: string[]
}

/** "Mate in N" or, for a defence puzzle, "Stop mate in N". */
export function puzzleKindLabel(problem: MateProblem): string {
  const s = getStrings()
  return problem.saves ? s.puzzles.defendMateIn(problem.mateIn) : s.puzzles.mateIn(problem.mateIn)
}

/** Roughly a third of the set has Black to move. */
export function puzzleColorToMove(problem: MateProblem): 'white' | 'black' {
  return problem.fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

/**
 * The next unsolved puzzle: the lowest-rated one above the median rating of the last `recent`
 * clean solves (solved without revealing the answer), so each one stretches a little. List order
 * without a rated clean solve, or once nothing unsolved is rated above that median.
 * `solvedIds` is oldest solve first.
 */
export function nextPuzzleByRating(
  problems: MateProblem[],
  solvedIds: number[],
  revealedIds: number[],
  recent = 10,
): MateProblem | undefined {
  const solved = new Set(solvedIds)
  const revealed = new Set(revealedIds)
  const ratingById = new Map(problems.map((p) => [p.id, p.rating]))
  const unsolved = problems.filter((p) => !solved.has(p.id))
  const ratings = solvedIds
    .filter((id) => !revealed.has(id))
    .map((id) => ratingById.get(id))
    .filter((r): r is number => r !== undefined)
    .slice(-recent)
    .sort((a, b) => a - b)
  if (ratings.length === 0) return unsolved[0]
  const mid = Math.floor(ratings.length / 2)
  const median = ratings.length % 2 ? ratings[mid] : (ratings[mid - 1] + ratings[mid]) / 2
  const next = unsolved
    .filter((p) => p.rating !== undefined && p.rating > median)
    .reduce<MateProblem | undefined>(
      (best, p) => (!best || p.rating! < best.rating! ? p : best),
      undefined,
    )
  return next ?? unsolved[0]
}
