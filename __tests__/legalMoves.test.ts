import { describe, expect, it } from 'vitest'
import { legalDestinations } from '@/lib/legalMoves'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('legalDestinations', () => {
  it('returns every legal destination for a piece, none flagged as captures', () => {
    // White knight on b1 can hop to a3 or c3, nothing there to capture.
    const destinations = legalDestinations(START_FEN, 'b1')
    expect(destinations).toEqual(
      expect.arrayContaining([
        { to: 'a3', isCapture: false },
        { to: 'c3', isCapture: false },
      ]),
    )
    expect(destinations).toHaveLength(2)
  })

  it('flags a capture separately from a quiet move', () => {
    // White knight on e4 can go to a bunch of empty squares, and capture the
    // black pawn on f6.
    const fen = 'rnbqkb1r/pppppppp/5n2/8/4N3/8/PPPPPPPP/R1BQKB1R w KQkq - 4 4'
    const destinations = legalDestinations(fen, 'e4')
    expect(destinations).toContainEqual({ to: 'f6', isCapture: true })
    expect(destinations.filter((d) => d.isCapture)).toHaveLength(1)
  })

  it('returns an empty array for an empty square', () => {
    expect(legalDestinations(START_FEN, 'e4')).toEqual([])
  })
})
