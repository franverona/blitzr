import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { forcedMateWithin, isForcedMate } from '@/lib/forcedMate'
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
  // local Polgár set 222-2427, Lichess mates 10001-20000, Lichess defences 20001 and up.
  it('has unique ids in each set’s range', () => {
    const ids = BUNDLED_MATES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of BUNDLED_MATES) {
      if (p.saves) expect(p.id, p.title).toBeGreaterThanOrEqual(20001)
      else if (p.url) expect(p.id, p.title).toBeGreaterThanOrEqual(10001)
      else expect(p.id, p.title).toBeLessThanOrEqual(221)
      if (p.url && !p.saves) expect(p.id, p.title).toBeLessThanOrEqual(20000)
    }
  })

  it('every defence puzzle’s saves are legal, and the game’s losing move isn’t one', () => {
    for (const problem of BUNDLED_MATES.filter((p) => p.saves)) {
      const legal = new Chess(problem.fen).moves()
      expect(problem.saves!.length, `#${problem.id}`).toBeGreaterThan(0)
      for (const san of problem.saves!) expect(legal, `#${problem.id}`).toContain(san)
      expect(problem.saves, `#${problem.id}`).not.toContain(problem.moves[0])
    }
  })

  it('a random sample of defence puzzles: every save stops the mate', () => {
    const candidates = BUNDLED_MATES.filter((p) => p.saves)
    const sample = [...candidates].sort(() => Math.random() - 0.5).slice(0, 8)
    console.info(`Defence sample: ${sample.map((p) => `#${p.id}`).join(', ')}`)

    for (const problem of sample) {
      for (const san of problem.saves!) {
        const chess = new Chess(problem.fen)
        chess.move(san)
        expect(forcedMateWithin(chess.fen(), problem.mateIn), `#${problem.id}: ${san}`).toBe(false)
      }
    }
  }, 60_000)

  // Checking all 2,000+ entries takes hours, so sample a few per run.
  const FORCED_MATE_SAMPLE_SIZE = 8

  it(`a random sample of ${FORCED_MATE_SAMPLE_SIZE} mate-in-2/3 problems are forced against every legal reply`, () => {
    // A defence puzzle's FEN is the defender's move, so there's no mate to find from it.
    const candidates = BUNDLED_MATES.filter((p) => p.mateIn > 1 && !p.saves)
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
