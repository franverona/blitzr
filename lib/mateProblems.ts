// Mate-in-N puzzle type and client-safe helpers. The puzzles themselves load
// server-side from lib/puzzleSet.ts, so client components importing this file
// don't ship them to the browser.
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
}

/** Roughly a third of the set has Black to move. */
export function puzzleColorToMove(problem: MateProblem): 'white' | 'black' {
  return problem.fen.split(' ')[1] === 'b' ? 'black' : 'white'
}
