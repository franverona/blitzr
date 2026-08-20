import { describe, expect, it } from 'vitest'
import { parseBestLine, parseBestMove, parseMultiPvOutput } from '@/lib/stockfish/client'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
// After 1. e4 — black to move.
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

describe('parseBestMove', () => {
  it('parses an ordinary move into from/to squares and SAN', () => {
    expect(parseBestMove(START_FEN, 'e2e4')).toEqual({ from: 'e2', to: 'e4', san: 'e4' })
  })

  it('includes the promoted piece in the SAN', () => {
    // Black pawn one step from promoting, white king nearby — b1=Q is legal
    // and check.
    const fen = '7k/8/8/8/8/8/1p6/7K b - - 0 1'
    expect(parseBestMove(fen, 'b2b1q')).toEqual({ from: 'b2', to: 'b1', san: 'b1=Q+' })
  })

  it('converts castling', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'
    expect(parseBestMove(fen, 'e1g1')).toEqual({ from: 'e1', to: 'g1', san: 'O-O' })
  })

  it('returns null for "(none)" — no legal moves', () => {
    expect(parseBestMove(START_FEN, '(none)')).toBeNull()
  })

  it('returns null for a move that is illegal in the given position', () => {
    expect(parseBestMove(START_FEN, 'e2e5')).toBeNull()
  })
})

describe('parseBestLine', () => {
  it('replays a principal variation into SAN', () => {
    expect(parseBestLine(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6'])).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
    ])
  })

  it('includes the promoted piece in the SAN', () => {
    const fen = '7k/8/8/8/8/8/1p6/7K b - - 0 1'
    expect(parseBestLine(fen, ['b2b1q'])).toEqual(['b1=Q+'])
  })

  it('stops at the first move that no longer applies', () => {
    // e7e5 is illegal immediately (no e4 played first) — nothing after it
    // gets replayed either, even though g1f3 would otherwise be legal.
    expect(parseBestLine(START_FEN, ['e7e5', 'g1f3'])).toEqual([])
  })

  it('returns an empty array for an empty PV', () => {
    expect(parseBestLine(START_FEN, [])).toEqual([])
  })
})

describe('parseMultiPvOutput', () => {
  it('sorts lines by multipv slot and keeps the last info per slot', () => {
    const transcript = [
      'info depth 1 multipv 1 score cp 10 pv e2e4',
      'info depth 1 multipv 2 score cp 5 pv d2d4',
      // A deeper search re-reports both slots — the later cp/pv should win.
      'info depth 10 multipv 2 score cp 8 pv d2d4 d7d5',
      'info depth 10 multipv 1 score cp 32 pv e2e4 e7e5 g1f3',
      'bestmove e2e4',
    ]
    expect(parseMultiPvOutput(START_FEN, transcript)).toEqual([
      { cp: 32, mate: null, move: { from: 'e2', to: 'e4', san: 'e4', bestLine: ['e5', 'Nf3'] } },
      { cp: 8, mate: null, move: { from: 'd2', to: 'd4', san: 'd4', bestLine: ['d5'] } },
    ])
  })

  it('flips cp/mate to White’s perspective when Black is to move', () => {
    const transcript = ['info depth 5 multipv 1 score cp -20 pv e7e5', 'bestmove e7e5']
    expect(parseMultiPvOutput(AFTER_E4_FEN, transcript)).toEqual([
      { cp: 20, mate: null, move: { from: 'e7', to: 'e5', san: 'e5', bestLine: [] } },
    ])
  })

  it('reports a forced mate without a cp value', () => {
    const transcript = ['info depth 3 multipv 1 score mate 2 pv e2e4', 'bestmove e2e4']
    expect(parseMultiPvOutput(START_FEN, transcript)).toEqual([
      { cp: null, mate: 2, move: { from: 'e2', to: 'e4', san: 'e4', bestLine: [] } },
    ])
  })

  it('drops a slot the engine never sent a pv for', () => {
    const transcript = ['info depth 1 multipv 1 score cp 10 pv e2e4', 'bestmove e2e4']
    expect(parseMultiPvOutput(START_FEN, transcript)).toEqual([
      { cp: 10, mate: null, move: { from: 'e2', to: 'e4', san: 'e4', bestLine: [] } },
    ])
  })

  it('returns an empty array when the transcript has no usable info lines', () => {
    expect(parseMultiPvOutput(START_FEN, ['bestmove (none)'])).toEqual([])
  })
})
