import { describe, expect, it } from 'vitest'
import { terminalEval } from '@/lib/stockfish/analyze'

// Fool's mate (1. f3 e5 2. g4 Qh4#) — black delivers mate, white to move with
// no legal moves.
const FOOLS_MATE_FEN = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'

// Scholar's mate (1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#) — white delivers
// mate, black to move with no legal moves.
const SCHOLARS_MATE_FEN = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4'

describe('terminalEval', () => {
  it('scores a position where white is checkmated as a win for black', () => {
    expect(terminalEval(FOOLS_MATE_FEN)).toEqual({ cp: null, mate: -1 })
  })

  it('scores a position where black is checkmated as a win for white', () => {
    expect(terminalEval(SCHOLARS_MATE_FEN)).toEqual({ cp: null, mate: 1 })
  })

  it('returns null (ask the engine) for a normal, non-terminal position', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(terminalEval(startFen)).toBeNull()
  })
})
