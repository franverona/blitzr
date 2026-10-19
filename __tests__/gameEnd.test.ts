import { describe, expect, it } from 'vitest'
import { gameEndBadges } from '@/lib/gameEnd'

const MIDGAME = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
// Fool's mate: White is mated.
const MATED = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'

describe('gameEndBadges', () => {
  it('reads checkmate off the board, ignoring results', () => {
    expect(gameEndBadges(MATED, { white: 'resigned', black: 'win' })).toEqual([
      { color: 'white', variant: 'loss', reason: 'checkmate' },
      { color: 'black', variant: 'win', reason: 'winner' },
    ])
  })

  it('reads an on-board draw', () => {
    expect(gameEndBadges(STALEMATE).map((b) => b.reason)).toEqual(['draw', 'draw'])
  })

  it('shows nothing mid-game without final results', () => {
    expect(gameEndBadges(MIDGAME)).toEqual([])
  })

  it('flags the loser of a resignation or timeout', () => {
    expect(gameEndBadges(MIDGAME, { white: 'win', black: 'resigned' })).toEqual([
      { color: 'black', variant: 'flag', reason: 'resigned' },
      { color: 'white', variant: 'win', reason: 'winner' },
    ])
    expect(gameEndBadges(MIDGAME, { white: 'timeout', black: 'win' })[0]).toEqual({
      color: 'white',
      variant: 'flag',
      reason: 'timeout',
    })
  })

  it("falls back to a generic loss for unknown codes and manual games' 'loss'", () => {
    expect(gameEndBadges(MIDGAME, { white: 'loss', black: 'win' })[0].reason).toBe('lost')
  })

  it('labels off-board draws by their reason', () => {
    expect(gameEndBadges(MIDGAME, { white: 'agreed', black: 'agreed' })).toEqual([
      { color: 'white', variant: 'draw', reason: 'agreed' },
      { color: 'black', variant: 'draw', reason: 'agreed' },
    ])
    expect(gameEndBadges(MIDGAME, { white: 'draw', black: 'draw' })[0].reason).toBe('draw')
  })

  it('shows nothing for a result it does not understand', () => {
    expect(gameEndBadges(MIDGAME, { white: 'abandoned', black: 'abandoned' })).toEqual([])
  })
})
