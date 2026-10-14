import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { moveSoundFor } from '@/lib/moveSound'

function after(fen: string, san: string): string {
  const c = new Chess(fen)
  c.move(san)
  return c.fen()
}

const START = new Chess().fen()

describe('moveSoundFor', () => {
  it.each([
    ['plain move', START, 'e4', 'move-self'],
    ['capture', 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'exd5', 'capture'],
    [
      'en passant',
      'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
      'exf6',
      'capture',
    ],
    ['castle', 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'O-O', 'castle'],
    ['promotion', '8/P6k/8/8/8/8/8/K7 w - - 0 1', 'a8=Q', 'promote'],
    ['check', '4k3/8/8/8/8/8/8/4K2R w K - 0 1', 'Rh8+', 'move-check'],
    ['mate', '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 'Ra8#', 'game-end'],
    ['stalemate', 'k7/8/1Q6/8/8/8/8/7K w - - 0 1', 'Qc7', 'game-end'],
  ])('%s', (_, fen, san, expected) => {
    expect(moveSoundFor(fen, after(fen, san))).toBe(expected)
  })

  it('falls back to piece count on a multi-ply jump', () => {
    const c = new Chess()
    for (const m of ['e4', 'd5', 'exd5', 'Qxd5']) c.move(m)
    expect(moveSoundFor(START, c.fen())).toBe('capture')
  })
})
