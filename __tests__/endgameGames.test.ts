import { describe, expect, it } from 'vitest'
import {
  findGamesReachingMaterial,
  materialKey,
  piecesReached,
  plyReachingMaterial,
} from '@/lib/endgameGames'
import type { Game } from '@/lib/types'

// Rook vs rook, as in the Philidor lesson (White also has a pawn).
const ROOK_PAWN_VS_ROOK = '4k3/7R/r7/4PK2/8/8/8/8 w - - 0 1'
// After 1.Rxa8 Rxh1+ White has rook + pawn against Black's rook.
const START = 'r6r/4k3/8/8/4P3/8/8/R3K2R w - - 0 1'

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: Math.random().toString(36).slice(2),
    url: '',
    pgn: '',
    movesSan: ['Rxa8', 'Rxh1+', 'Kd2'],
    initialFen: START,
    finalFen: null,
    timeControl: '180',
    timeClass: 'blitz',
    rules: 'chess',
    rated: true,
    endTime: 0,
    whiteUsername: 'me',
    whiteRating: null,
    whiteResult: 'win',
    blackUsername: 'opp',
    blackRating: null,
    blackResult: 'resigned',
    myColor: 'white',
    myResult: 'win',
    isMine: true,
    ecoCode: null,
    ecoName: null,
    ecoUrl: null,
    archiveYm: '2023-11',
    site: 'chesscom',
    createdAt: '',
    ...overrides,
  }
}

describe('materialKey', () => {
  it("lists each side's pieces, strongest first, ignoring kings and pawns", () => {
    expect(materialKey('4k3/1p6/1P6/2PK4/8/8/8/1q1BR3 w - - 0 1')).toEqual({ w: 'RB', b: 'Q' })
  })
})

describe('piecesReached', () => {
  it('records each set of pieces once, at the first ply it appears', () => {
    expect(piecesReached(makeGame({}))).toEqual(
      new Map([
        ['RR/RR', 0],
        ['RR/R', 1],
        ['R/R', 2],
      ]),
    )
  })
})

describe('plyReachingMaterial', () => {
  it('finds the first ply with the same material', () => {
    expect(plyReachingMaterial(makeGame({}), ROOK_PAWN_VS_ROOK)).toBe(2)
  })

  it('matches with the colors swapped', () => {
    // Black ends up with the rook; the lesson gives it to White.
    const game = makeGame({ initialFen: 'r3k3/8/8/8/8/8/8/R5K1 b - - 0 1', movesSan: ['Rxa1+'] })
    expect(plyReachingMaterial(game, '8/8/8/4k3/8/8/4K3/3R4 w - - 0 1')).toBe(1)
  })

  it('ignores pawns', () => {
    expect(plyReachingMaterial(makeGame({}), '4k3/7R/r7/8/8/8/8/4K3 w - - 0 1')).toBe(2)
  })

  it('returns null when the game never had that material', () => {
    expect(
      plyReachingMaterial(makeGame({ movesSan: ['Rxa8', 'Kd6'] }), ROOK_PAWN_VS_ROOK),
    ).toBeNull()
  })

  it('skips a game that ended with more material', () => {
    expect(plyReachingMaterial(makeGame({ finalFen: START }), ROOK_PAWN_VS_ROOK)).toBeNull()
  })

  it('returns null for a game without moves', () => {
    expect(plyReachingMaterial(makeGame({ movesSan: null }), ROOK_PAWN_VS_ROOK)).toBeNull()
  })
})

describe('findGamesReachingMaterial', () => {
  it('counts results and lists the most recent games first', () => {
    const games = [
      makeGame({ id: 'old', endTime: 1, myResult: 'win' }),
      makeGame({ id: 'new', endTime: 3, myResult: 'draw', myColor: 'black' }),
      makeGame({ id: 'mid', endTime: 2, myResult: 'loss' }),
      makeGame({ id: 'never', endTime: 4, movesSan: ['Rxa8'] }),
    ]
    const result = findGamesReachingMaterial(games, ROOK_PAWN_VS_ROOK)
    expect(result).toMatchObject({ games: 3, wins: 1, draws: 1, losses: 1 })
    expect(result.recent.map((g) => g.gameId)).toEqual(['new', 'mid', 'old'])
    expect(result.recent[0]).toMatchObject({ ply: 2, opponent: 'me' })
  })

  it("reuses a memoized game's replay", () => {
    const game = makeGame({ id: 'g' })
    const memo = new Map<string, Map<string, number>>()
    findGamesReachingMaterial([game], ROOK_PAWN_VS_ROOK, memo)
    expect([...memo.values()][0].get('R/R')).toBe(2)
    memo.set([...memo.keys()][0], new Map([['R/R', 7]]))
    expect(findGamesReachingMaterial([game], ROOK_PAWN_VS_ROOK, memo).recent[0].ply).toBe(7)
  })
})
