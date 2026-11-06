import { describe, expect, it } from 'vitest'
import { PracticeGameError, buildPracticeGame } from '@/lib/practiceGame'
import type { Game } from '@/lib/types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const NOW = new Date('2026-11-06T10:00:00.000Z')

const source: Game = {
  id: 'src',
  url: 'https://www.chess.com/game/live/1',
  pgn: '',
  movesSan: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
  initialFen: START,
  finalFen: null,
  timeControl: '180',
  timeClass: 'blitz',
  rules: 'chess',
  rated: true,
  endTime: 1,
  whiteUsername: 'fverona',
  whiteRating: 1200,
  whiteResult: 'win',
  blackUsername: 'alice',
  blackRating: 1200,
  blackResult: 'checkmated',
  myColor: 'white',
  myResult: 'win',
  isMine: true,
  ecoCode: 'C23',
  ecoName: 'Bishops Opening',
  ecoUrl: null,
  archiveYm: '2026-09',
  createdAt: '',
}

const base = {
  source,
  myName: 'fverona',
  elo: 1600 as const,
  resigned: false,
  now: NOW,
}

describe('buildPracticeGame', () => {
  it('starts from the source position and keeps the mate', () => {
    // After 3. Qh5, Black to move: the bot plays a different defence and still gets mated.
    const game = buildPracticeGame({ ...base, ply: 5, movesSan: ['Nf6', 'Qxf7#'] })
    expect(game.initialFen).toBe(
      'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
    )
    expect(game.movesSan).toEqual(['Nf6', 'Qxf7#'])
    expect(game.myResult).toBe('win')
    expect(game.blackUsername).toBe('Stockfish 1600')
    expect(game.blackResult).toBe('checkmated')
    expect(game.archiveYm).toBe('practice')
    expect(game.practiceOf).toEqual({ gameId: 'src', ply: 5 })
    expect(game.url).toBe('')
    expect(game.timeClass).toBe('practice')
    expect(game.ecoName).toBeNull()
    expect(game.endTime).toBe(NOW.getTime() / 1000)
  })

  it('records a resignation as a loss', () => {
    const game = buildPracticeGame({ ...base, ply: 4, movesSan: ['Qh5', 'g6'], resigned: true })
    expect(game.myResult).toBe('loss')
    expect(game.whiteResult).toBe('resigned')
    expect(game.blackResult).toBe('win')
  })

  it('records a stalemate as a draw', () => {
    const stalemateSource = {
      ...source,
      initialFen: 'k7/8/1Q6/8/8/8/8/7K w - - 0 1',
      movesSan: ['Kg2'],
      ecoCode: null,
      ecoName: null,
    }
    // Any quiet king move leaves the a8 king without a move.
    const game = buildPracticeGame({ ...base, source: stalemateSource, ply: 0, movesSan: ['Kg2'] })
    expect(game.myResult).toBe('draw')
    expect(game.whiteResult).toBe('stalemate')
  })

  it('rejects illegal moves, unfinished games and lines without a user move', () => {
    expect(() => buildPracticeGame({ ...base, ply: 4, movesSan: ['Qh6'] })).toThrow(
      PracticeGameError,
    )
    expect(() => buildPracticeGame({ ...base, ply: 4, movesSan: ['Qh5'] })).toThrow(
      PracticeGameError,
    )
    expect(() => buildPracticeGame({ ...base, ply: 5, movesSan: ['Nf6'], resigned: true })).toThrow(
      PracticeGameError,
    )
    expect(() => buildPracticeGame({ ...base, ply: 99, movesSan: ['e4'] })).toThrow(
      PracticeGameError,
    )
  })

  it('refuses to practice a practice game', () => {
    const practice = buildPracticeGame({ ...base, ply: 5, movesSan: ['Nf6', 'Qxf7#'] })
    expect(() =>
      buildPracticeGame({ ...base, source: practice, ply: 0, movesSan: ['Nf6', 'Qxf7#'] }),
    ).toThrow(PracticeGameError)
  })
})
