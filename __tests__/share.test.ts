import { describe, expect, it } from 'vitest'
import { lichessAnalysisUrl, linePgn } from '@/lib/share'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('linePgn', () => {
  it('writes the moves of a line from the standard start', () => {
    expect(linePgn(START, ['e4', 'e5', 'Nf3'])).toMatch(/\n\n1\. e4 e5 2\. Nf3 \*$/)
  })

  it('adds FEN/SetUp headers for a custom start', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'
    const pgn = linePgn(fen, ['e4'])
    expect(pgn).toContain(`[FEN "${fen}"]`)
    expect(pgn).toContain('1. e4')
  })

  it('stops at the first move that no longer applies', () => {
    expect(linePgn(START, ['e4', 'Qxf7', 'e5'])).toMatch(/\n\n1\. e4 \*$/)
  })
})

describe('lichessAnalysisUrl', () => {
  it('encodes the FEN path-style with the board orientation', () => {
    expect(lichessAnalysisUrl(START, 'black')).toBe(
      'https://lichess.org/analysis/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1?color=black',
    )
  })
})
