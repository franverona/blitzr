import { describe, expect, it } from 'vitest'
import { legalDestinations } from '@/lib/legalMoves'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('legalDestinations', () => {
  it('returns every legal destination for a piece, none flagged as captures', () => {
    // White knight on b1 can hop to a3 or c3, nothing there to capture.
    const destinations = legalDestinations(START_FEN, 'b1')
    expect(destinations).toEqual(
      expect.arrayContaining([
        { to: 'a3', isCapture: false, isPromotion: false },
        { to: 'c3', isCapture: false, isPromotion: false },
      ]),
    )
    expect(destinations).toHaveLength(2)
  })

  it('flags a capture separately from a quiet move', () => {
    // White knight on e4 can go to a bunch of empty squares, and capture the
    // black pawn on f6.
    const fen = 'rnbqkb1r/pppppppp/5n2/8/4N3/8/PPPPPPPP/R1BQKB1R w KQkq - 4 4'
    const destinations = legalDestinations(fen, 'e4')
    expect(destinations).toContainEqual({ to: 'f6', isCapture: true, isPromotion: false })
    expect(destinations.filter((d) => d.isCapture)).toHaveLength(1)
  })

  it('returns an empty array for an empty square', () => {
    expect(legalDestinations(START_FEN, 'e4')).toEqual([])
  })

  it('flags a promotion move once, not once per promotion piece', () => {
    // White pawn on b7 can push to b8 or capture on a8/c8 — chess.js reports
    // four moves per to-square (one per promotable piece), which should
    // collapse into a single flagged destination each here.
    const fen = 'r1r1k3/1P6/8/8/8/8/8/6K1 w - - 0 1'
    const destinations = legalDestinations(fen, 'b7')
    expect(destinations).toEqual(
      expect.arrayContaining([
        { to: 'a8', isCapture: true, isPromotion: true },
        { to: 'b8', isCapture: false, isPromotion: true },
        { to: 'c8', isCapture: true, isPromotion: true },
      ]),
    )
    expect(destinations).toHaveLength(3)
  })
})
