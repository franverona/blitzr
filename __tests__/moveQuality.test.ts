import { describe, expect, it } from 'vitest'
import { winDropFromEqual } from '@/lib/analysis'
import { classifyMoveQuality, summarizeMoveQuality } from '@/lib/moveQuality'
import { buildPositions } from '@/lib/positions'
import type { PositionEval } from '@/lib/types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function cp(value: number): PositionEval {
  return { cp: value, mate: null, bestMove: null }
}

describe('classifyMoveQuality', () => {
  it('buckets win-% drops from best to blunder', () => {
    expect(classifyMoveQuality(-2)).toBe('best')
    expect(classifyMoveQuality(0)).toBe('best')
    expect(classifyMoveQuality(winDropFromEqual(5))).toBe('excellent')
    expect(classifyMoveQuality(winDropFromEqual(20))).toBe('good')
    expect(classifyMoveQuality(winDropFromEqual(45))).toBe('inaccuracy')
    expect(classifyMoveQuality(winDropFromEqual(150))).toBe('mistake')
    expect(classifyMoveQuality(winDropFromEqual(200))).toBe('blunder')
    expect(classifyMoveQuality(49)).toBe('blunder')
  })

  it('rates a big cp drop in a won position as minor', () => {
    const summary = summarizeMoveQuality([cp(900), cp(650)], ['Qd2'])
    expect(summary.white.counts.blunder).toBe(0)
  })
})

describe('summarizeMoveQuality', () => {
  it('attributes ply 1 to Black when the game starts with Black to move', () => {
    const evals = [cp(0), cp(500), cp(500)]
    const summary = summarizeMoveQuality(evals, ['Kd7', 'Kd2'], '4k3/8/8/8/8/8/8/4K3 b - - 0 1')
    expect(summary.black.counts.blunder).toBe(1)
    expect(summary.white.counts.blunder).toBe(0)
  })

  it('scores a perfect game at 100 accuracy with every move "best"', () => {
    const evals = [cp(20), cp(20), cp(20)]
    const movesSan = ['e4', 'e5']
    const summary = summarizeMoveQuality(evals, movesSan)
    expect(summary.white.accuracy).toBe(100)
    expect(summary.white.counts.best).toBe(1)
    expect(summary.black.accuracy).toBe(100)
    expect(summary.black.counts.best).toBe(1)
  })

  it('tanks accuracy and tallies a blunder for a sharp swing', () => {
    // ply 1 (white, e4): +20 -> +30, fine. ply 2 (black blunder): +30 -> +330.
    const evals = [cp(20), cp(30), cp(330)]
    const movesSan = ['e4', 'Nf6??']
    const summary = summarizeMoveQuality(evals, movesSan)
    expect(summary.white.counts.best).toBe(1)
    expect(summary.black.counts.blunder).toBe(1)
    expect(summary.black.plies.blunder).toEqual([2])
    expect(summary.white.plies.best).toEqual([1])
    expect(summary.black.accuracy).toBeLessThan(summary.white.accuracy)
  })

  it('splits accuracy by game phase when given the positions, null for a phase without moves', () => {
    // Both moves are in the opening (move 1); White's is perfect, Black's a blunder.
    const evals = [cp(20), cp(20), cp(330)]
    const movesSan = ['e4', 'Nf6??']
    const positions = buildPositions(START_FEN, movesSan)
    const summary = summarizeMoveQuality(evals, movesSan, START_FEN, positions)
    expect(summary.white.byPhase).toEqual({ opening: 100, middlegame: null, endgame: null })
    expect(summary.black.byPhase?.opening).toBe(summary.black.accuracy)
    // Opt-in: no positions, no replay.
    expect(summarizeMoveQuality(evals, movesSan).white.byPhase).toBeUndefined()
  })

  it('counts a move as endgame from the pieces left, whatever its move number', () => {
    const endgame = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'
    const summary = summarizeMoveQuality([cp(0), cp(0)], ['e4'], endgame, [endgame])
    expect(summary.white.byPhase).toEqual({ opening: null, middlegame: null, endgame: 100 })
  })

  it('defaults an empty side to 100 rather than 0', () => {
    const summary = summarizeMoveQuality([cp(0)], [])
    expect(summary.white.accuracy).toBe(100)
    expect(summary.black.accuracy).toBe(100)
  })
})
