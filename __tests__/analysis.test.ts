import { describe, expect, it } from 'vitest'
import { biggestBlunder, findBlunders, formatEval } from '@/lib/analysis'
import type { PositionEval } from '@/lib/types'

function cp(value: number): PositionEval {
  return { cp: value, mate: null }
}

function mate(n: number): PositionEval {
  return { cp: null, mate: n }
}

describe('findBlunders', () => {
  it('flags a white move that swings the eval sharply against white', () => {
    // ply 1 (white, e4): +20 -> +30, fine. ply 2 (black): +30 -> +40, fine.
    // ply 3 (white blunder): +40 -> -260, a ~300cp swing against the mover (white).
    const evals = [cp(20), cp(30), cp(40), cp(-260)]
    const movesSan = ['e4', 'e5', 'Qh5??']
    const blunders = findBlunders(evals, movesSan)
    expect(blunders).toHaveLength(1)
    expect(blunders[0]).toMatchObject({ ply: 3, moveSan: 'Qh5??', swingCp: 300 })
  })

  it('flags a black move using the mirrored perspective', () => {
    // ply 2 is black's move; eval goes from +10 (roughly equal) to +250
    // (great for white) — bad for black by 240cp.
    const evals = [cp(0), cp(10), cp(250)]
    const movesSan = ['e4', 'Nf6??']
    const blunders = findBlunders(evals, movesSan)
    expect(blunders).toHaveLength(1)
    expect(blunders[0]).toMatchObject({ ply: 2, moveSan: 'Nf6??', swingCp: 240 })
  })

  it('does not flag small, normal swings', () => {
    const evals = [cp(0), cp(20), cp(10), cp(30)]
    const movesSan = ['e4', 'e5', 'Nf3']
    expect(findBlunders(evals, movesSan)).toEqual([])
  })

  it('treats a swing into a mate-losing position as a blunder', () => {
    const evals = [cp(50), mate(-3)]
    const movesSan = ['Rxe6??']
    const blunders = findBlunders(evals, movesSan)
    expect(blunders).toHaveLength(1)
    expect(blunders[0].ply).toBe(1)
  })

  it('skips positions with a missing eval rather than throwing', () => {
    const evals = [cp(0), cp(20)]
    const movesSan = ['e4', 'e5', 'Nf3']
    expect(findBlunders(evals, movesSan)).toEqual([])
  })
})

describe('biggestBlunder', () => {
  it('returns null when there are no blunders', () => {
    expect(biggestBlunder([])).toBeNull()
  })

  it('returns the blunder with the largest swing', () => {
    const blunders = [
      { ply: 1, moveSan: 'a', evalBefore: cp(0), evalAfter: cp(0), swingCp: 250 },
      { ply: 3, moveSan: 'b', evalBefore: cp(0), evalAfter: cp(0), swingCp: 600 },
      { ply: 5, moveSan: 'c', evalBefore: cp(0), evalAfter: cp(0), swingCp: 400 },
    ]
    expect(biggestBlunder(blunders)?.ply).toBe(3)
  })
})

describe('formatEval', () => {
  it('formats a positive cp eval with a leading plus and one decimal', () => {
    expect(formatEval(cp(143))).toBe('+1.4')
  })

  it('formats a negative cp eval without a double sign', () => {
    expect(formatEval(cp(-320))).toBe('-3.2')
  })

  it('formats zero without a sign', () => {
    expect(formatEval(cp(0))).toBe('0.0')
  })

  it('formats mate scores for both sides', () => {
    expect(formatEval(mate(3))).toBe('M3')
    expect(formatEval(mate(-2))).toBe('-M2')
  })
})
