import { describe, expect, it } from 'vitest'
import {
  ecoNameFromUrl,
  normalizeGame,
  normalizeResult,
  parsePgnHeaders,
} from '@/lib/chesscom/normalize'
import type { ChesscomGame } from '@/lib/chesscom/client'

describe('normalizeResult', () => {
  it('maps "win" to win', () => {
    expect(normalizeResult('win')).toBe('win')
  })

  it('maps known draw outcomes to draw', () => {
    expect(normalizeResult('agreed')).toBe('draw')
    expect(normalizeResult('stalemate')).toBe('draw')
    expect(normalizeResult('repetition')).toBe('draw')
    expect(normalizeResult('insufficient')).toBe('draw')
    expect(normalizeResult('50move')).toBe('draw')
    expect(normalizeResult('timevsinsufficient')).toBe('draw')
  })

  it('maps everything else to loss', () => {
    expect(normalizeResult('checkmated')).toBe('loss')
    expect(normalizeResult('resigned')).toBe('loss')
    expect(normalizeResult('timeout')).toBe('loss')
    expect(normalizeResult('abandoned')).toBe('loss')
  })
})

describe('ecoNameFromUrl', () => {
  it('splits family name from the move list', () => {
    expect(
      ecoNameFromUrl(
        'https://www.chess.com/openings/Closed-Sicilian-Defense-Grand-Prix-Attack-3...g6-4.Bc4-Bg7-5.Nf3',
      ),
    ).toBe('Closed Sicilian Defense Grand Prix Attack: 3...g6 4.Bc4 Bg7 5.Nf3')
  })

  it('returns the decoded slug unchanged when no move-number token is found', () => {
    expect(ecoNameFromUrl('https://www.chess.com/openings/Italian-Game')).toBe('Italian Game')
  })
})

describe('parsePgnHeaders', () => {
  it('extracts header tag/value pairs', () => {
    const pgn = '[Event "Play vs Coach"]\n[White "fverona"]\n[Black "Coach-David"]\n\n1. e4 *'
    expect(parsePgnHeaders(pgn)).toEqual({
      Event: 'Play vs Coach',
      White: 'fverona',
      Black: 'Coach-David',
    })
  })

  it('returns an empty object when there are no headers', () => {
    expect(parsePgnHeaders('1. e4 e5 *')).toEqual({})
  })
})

function makeRawGame(overrides: Partial<ChesscomGame> = {}): ChesscomGame {
  return {
    url: 'https://www.chess.com/game/live/1',
    pgn: '[Event "Live Chess"]\n[ECO "C50"]\n[ECOUrl "https://www.chess.com/openings/Italian-Game"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *',
    time_control: '180',
    end_time: 1700000000,
    rated: true,
    uuid: 'game-1',
    initial_setup: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    time_class: 'blitz',
    rules: 'chess',
    white: { rating: 1500, result: 'win', username: 'Me', uuid: 'w' },
    black: { rating: 1490, result: 'checkmated', username: 'Opponent', uuid: 'b' },
    ...overrides,
  }
}

describe('normalizeGame', () => {
  it('derives my color/result by matching the configured username', () => {
    const game = normalizeGame(makeRawGame(), 'me', '2023-11')
    expect(game.myColor).toBe('white')
    expect(game.myResult).toBe('win')
  })

  it('matches the username case-insensitively and reads the black side when playing black', () => {
    const raw = makeRawGame({
      white: { rating: 1490, result: 'checkmated', username: 'Opponent', uuid: 'w' },
      black: { rating: 1500, result: 'win', username: 'ME', uuid: 'b' },
    })
    const game = normalizeGame(raw, 'me', '2023-11')
    expect(game.myColor).toBe('black')
    expect(game.myResult).toBe('win')
  })

  it('extracts ECO code/name and derives moves + final FEN via chess.js', () => {
    const game = normalizeGame(makeRawGame(), 'me', '2023-11')
    expect(game.ecoCode).toBe('C50')
    expect(game.ecoName).toBe('Italian Game')
    expect(game.movesSan).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'])
    expect(game.finalFen).toBe(
      'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    )
  })

  it('falls back to null moves/finalFen for PGN chess.js cannot parse, without throwing', () => {
    const raw = makeRawGame({ pgn: '[Event "Bughouse"]\n\n1. e4 P@e5 *' })
    const game = normalizeGame(raw, 'me', '2023-11')
    expect(game.movesSan).toBeNull()
    expect(game.finalFen).toBeNull()
    expect(game.pgn).toBe(raw.pgn)
  })
})
