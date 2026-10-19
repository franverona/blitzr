import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { isForcedMate } from '@/lib/forcedMate'
import { puzzleColorToMove } from '@/lib/mateProblems'
import { BUNDLED_MATES, getMateProblem } from '@/lib/puzzleSet'

describe('getMateProblem', () => {
  it('finds a problem by id', () => {
    expect(getMateProblem(1)).toBe(BUNDLED_MATES[0])
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

// Guards against a bad edit or import shipping an illegal or non-mating line.
describe('bundled puzzle content', () => {
  it('every problem starts from a legal position (side not to move isn’t in check)', () => {
    for (const problem of BUNDLED_MATES) {
      // The solver may start in check (Lichess puzzles often do); the other king must not be.
      const [board, turn] = problem.fen.split(' ')
      const flipped = new Chess(`${board} ${turn === 'w' ? 'b' : 'w'} - - 0 1`, {
        skipValidation: true,
      })
      expect(flipped.isCheck(), `#${problem.id}`).toBe(false)
    }
  })

  it('every problem’s move list plays out legally and ends in checkmate', () => {
    for (const problem of BUNDLED_MATES) {
      const chess = new Chess(problem.fen)
      for (const san of problem.moves) {
        expect(() => chess.move(san), `#${problem.id}: ${san}`).not.toThrow()
      }
      expect(chess.isCheckmate(), `#${problem.id}`).toBe(true)
    }
  })

  it('mateIn matches how many of the solver’s own moves the line actually takes', () => {
    for (const problem of BUNDLED_MATES) {
      const solverMoves = Math.ceil(problem.moves.length / 2)
      expect(solverMoves, `#${problem.id}`).toBe(problem.mateIn)
    }
  })

  // Ids key solved progress, so they must never collide or shift: real games are 1-221, the
  // local Polgár set 222-2427, Lichess 10001 and up.
  it('has unique ids in each set’s range', () => {
    const ids = BUNDLED_MATES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of BUNDLED_MATES) {
      if (p.url) expect(p.id, p.title).toBeGreaterThanOrEqual(10001)
      else expect(p.id, p.title).toBeLessThanOrEqual(221)
    }
  })

  // Checking all 2,000+ entries takes hours, so sample a few per run.
  const FORCED_MATE_SAMPLE_SIZE = 8

  it(`a random sample of ${FORCED_MATE_SAMPLE_SIZE} mate-in-2/3 problems are forced against every legal reply`, () => {
    const candidates = BUNDLED_MATES.filter((p) => p.mateIn > 1)
    const sample = [...candidates].sort(() => Math.random() - 0.5).slice(0, FORCED_MATE_SAMPLE_SIZE)
    // Unseeded, so log the sample to make a failure reproducible.
    console.info(`Forced-mate sample: ${sample.map((p) => `#${p.id}`).join(', ')}`)

    for (const problem of sample) {
      expect(problem.mateIn, `#${problem.id}: mateIn too deep to brute-force`).toBeLessThanOrEqual(
        3,
      )
      expect(isForcedMate(problem.fen, problem.mateIn), `#${problem.id}`).toBe(true)
    }
  }, 60_000)
})
