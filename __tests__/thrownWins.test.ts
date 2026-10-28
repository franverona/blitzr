import { describe, expect, it } from 'vitest'
import { findThrownWins } from '@/lib/thrownWins'
import type { Game, GameAnalysis, PositionEval } from '@/lib/types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: 'g1',
    url: '',
    pgn: '',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6'],
    initialFen: START_FEN,
    finalFen: null,
    timeControl: '180',
    timeClass: 'blitz',
    rules: 'chess',
    rated: true,
    endTime: 1_700_000_000,
    whiteUsername: 'me',
    whiteRating: null,
    whiteResult: 'resigned',
    blackUsername: 'opp',
    blackRating: null,
    blackResult: 'win',
    myColor: 'white',
    myResult: 'loss',
    isMine: true,
    ecoCode: null,
    ecoName: null,
    ecoUrl: null,
    archiveYm: '2023-11',
    createdAt: '',
    ...overrides,
  }
}

const cp = (value: number): PositionEval => ({ cp: value, mate: null, bestMove: null })
const mate = (moves: number): PositionEval => ({ cp: null, mate: moves, bestMove: null })

function analyses(entries: [string, PositionEval[]][]): Map<string, GameAnalysis> {
  return new Map(entries.map(([gameId, evals]) => [gameId, { gameId, evals, analyzedAt: '' }]))
}

describe('findThrownWins', () => {
  it("lists a lost game at the user's best position once it was winning", () => {
    const game = makeGame({})
    // +7 is about 92.9% for White; the peak is position 2, after ply 2 (e5).
    const result = findThrownWins(
      [game],
      analyses([['g1', [cp(20), cp(300), cp(700), cp(-900), cp(-900)]]]),
    )
    expect(result).toMatchObject([{ gameId: 'g1', result: 'loss', peakPly: 2, moveSan: 'e5' }])
  })

  it("reads the user's side: Black's win chance is White's mirrored", () => {
    const game = makeGame({ myColor: 'black', myResult: 'draw' })
    expect(findThrownWins([game], analyses([['g1', [cp(0), mate(-3), cp(0)]]]))).toMatchObject([
      { result: 'draw', peakPly: 1, moveSan: 'e4' },
    ])
  })

  it('skips wins, games that never got winning, and unanalyzed games', () => {
    const evals: PositionEval[] = [cp(0), cp(900), cp(0)]
    expect(findThrownWins([makeGame({ myResult: 'win' })], analyses([['g1', evals]]))).toEqual([])
    expect(findThrownWins([makeGame({})], analyses([['g1', [cp(0), cp(400), cp(0)]]]))).toEqual([])
    expect(findThrownWins([makeGame({})], new Map())).toEqual([])
  })

  it('lists the newest game first', () => {
    const old = makeGame({ id: 'old', endTime: 1 })
    const recent = makeGame({ id: 'new', endTime: 2 })
    const evals = [cp(0), cp(900), cp(-900)]
    const ids = findThrownWins(
      [old, recent],
      analyses([
        ['old', evals],
        ['new', evals],
      ]),
    ).map((w) => w.gameId)
    expect(ids).toEqual(['new', 'old'])
  })
})
