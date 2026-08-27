import { describe, expect, it } from 'vitest'
import { classifyMoveQuality, summarizeMoveQuality } from '@/lib/moveQuality'
import type { PositionEval } from '@/lib/types'

function cp(value: number): PositionEval {
  return { cp: value, mate: null, bestMove: null }
}

describe('classifyMoveQuality', () => {
  it('buckets swings from best to blunder', () => {
    expect(classifyMoveQuality(-20)).toBe('best')
    expect(classifyMoveQuality(0)).toBe('best')
    expect(classifyMoveQuality(5)).toBe('excellent')
    expect(classifyMoveQuality(20)).toBe('good')
    expect(classifyMoveQuality(45)).toBe('inaccuracy')
    expect(classifyMoveQuality(150)).toBe('mistake')
    expect(classifyMoveQuality(200)).toBe('blunder')
    expect(classifyMoveQuality(900)).toBe('blunder')
  })
})

describe('summarizeMoveQuality', () => {
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
    expect(summary.black.accuracy).toBeLessThan(summary.white.accuracy)
  })

  it('defaults an empty side to 100 rather than 0', () => {
    const summary = summarizeMoveQuality([cp(0)], [])
    expect(summary.white.accuracy).toBe(100)
    expect(summary.black.accuracy).toBe(100)
  })
})
