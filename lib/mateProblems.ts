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
