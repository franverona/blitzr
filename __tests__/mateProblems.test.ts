import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { getMateProblem, MATE_PROBLEMS, puzzleColorToMove } from '@/lib/mateProblems'

describe('getMateProblem', () => {
  it('finds a problem by id', () => {
    expect(getMateProblem(1)).toBe(MATE_PROBLEMS[0])
  })

  it('returns undefined for an unknown id', () => {
    expect(getMateProblem(999999)).toBeUndefined()
  })
})

describe('puzzleColorToMove', () => {
  it('reads white from the FEN', () => {
    expect(puzzleColorToMove({ fen: '8/8/8/8/8/8/8/8 w - - 0 1' } as never)).toBe('white')
  })

  it('reads black from the FEN', () => {
    expect(puzzleColorToMove({ fen: '8/8/8/8/8/8/8/8 b - - 0 1' } as never)).toBe('black')
  })
})

// Same rationale as endgameTheory.test.ts's "plays out as a fully legal move
// sequence" check — a standing guard against a future bad edit (or import)
// silently shipping a puzzle whose "solution" isn't actually legal or
// doesn't actually mate, since nothing else re-verifies this at runtime.
describe('MATE_PROBLEMS content', () => {
  it('every problem starts from a legal position (side not to move isn’t in check)', () => {
    for (const problem of MATE_PROBLEMS) {
      const chess = new Chess(problem.fen)
      expect(chess.isCheck(), `#${problem.id}`).toBe(false)
    }
  })

  it('every problem’s move list plays out legally and ends in checkmate', () => {
    for (const problem of MATE_PROBLEMS) {
      const chess = new Chess(problem.fen)
      for (const san of problem.moves) {
        expect(() => chess.move(san), `#${problem.id}: ${san}`).not.toThrow()
      }
      expect(chess.isCheckmate(), `#${problem.id}`).toBe(true)
    }
  })

  it('mateIn matches how many of the solver’s own moves the line actually takes', () => {
    for (const problem of MATE_PROBLEMS) {
      const solverMoves = Math.ceil(problem.moves.length / 2)
      expect(solverMoves, `#${problem.id}`).toBe(problem.mateIn)
    }
  })

  it('has unique, sequential ids starting at 1', () => {
    const ids = MATE_PROBLEMS.map((p) => p.id)
    expect(ids).toEqual(MATE_PROBLEMS.map((_, i) => i + 1))
  })
})
