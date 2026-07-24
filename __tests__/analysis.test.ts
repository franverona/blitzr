import { describe, expect, it } from 'vitest'
import {
  biggestBlunder,
  blunderSeverity,
  describeEval,
  evalBarPercent,
  findBlunders,
  formatEval,
  formatSwing,
} from '@/lib/analysis'
import type { Blunder, PositionEval } from '@/lib/types'

function cp(value: number): PositionEval {
  return { cp: value, mate: null, bestMove: null }
}

function mate(n: number): PositionEval {
  return { cp: null, mate: n, bestMove: null }
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

describe('evalBarPercent', () => {
  it('splits the bar evenly at an equal eval', () => {
    expect(evalBarPercent(cp(0))).toBeCloseTo(50, 1)
  })

  it('favors white for a positive eval', () => {
    expect(evalBarPercent(cp(300))).toBeGreaterThan(50)
  })

  it('favors black for a negative eval', () => {
    expect(evalBarPercent(cp(-300))).toBeLessThan(50)
  })

  it('saturates near full/empty for a large eval rather than reaching 0/100', () => {
    const percent = evalBarPercent(cp(2000))
    expect(percent).toBeGreaterThan(90)
    expect(percent).toBeLessThan(100)
  })

  it('nearly fills the bar for a white mate and nearly empties it for a black mate', () => {
    expect(evalBarPercent(mate(2))).toBe(99)
    expect(evalBarPercent(mate(-2))).toBe(1)
  })
})

describe('describeEval', () => {
  it('calls a small eval equal', () => {
    expect(describeEval(cp(20))).toBe('Equal position')
  })

  it('describes a slight edge, a clear edge, and a winning position per side', () => {
    expect(describeEval(cp(100))).toBe('Slight edge for White')
    expect(describeEval(cp(-100))).toBe('Slight edge for Black')
    expect(describeEval(cp(250))).toBe('White is better')
    expect(describeEval(cp(500))).toBe('White is winning')
    expect(describeEval(cp(-900))).toBe('Black is completely winning')
  })

  it('describes forced mates for both sides', () => {
    expect(describeEval(mate(4))).toBe('White has a forced mate')
    expect(describeEval(mate(-1))).toBe('Black has a forced mate')
  })

  it('describes evals in Spanish', () => {
    expect(describeEval(cp(20), 'es')).toBe('Posición igualada')
    expect(describeEval(cp(500), 'es')).toBe('Posición ganadora para las blancas')
    expect(describeEval(mate(4), 'es')).toBe('Mate forzado para las blancas')
  })
})

describe('blunderSeverity', () => {
  it('classifies a swing just over the blunder threshold as a mistake', () => {
    expect(blunderSeverity(200)).toBe('mistake')
    expect(blunderSeverity(399)).toBe('mistake')
  })

  it('classifies a swing of 400cp or more as a blunder', () => {
    expect(blunderSeverity(400)).toBe('blunder')
    expect(blunderSeverity(1000)).toBe('blunder')
  })

  it('classifies a mate-sentinel-scale swing as a blunder', () => {
    expect(blunderSeverity(98_810)).toBe('blunder')
  })
})

describe('formatSwing', () => {
  function blunder(evalBefore: PositionEval, evalAfter: PositionEval, swingCp: number): Blunder {
    return { ply: 1, moveSan: 'a6', evalBefore, evalAfter, swingCp }
  }

  it('formats an ordinary swing in real pawns', () => {
    expect(formatSwing(blunder(cp(370), cp(580), 210))).toBe('2.1 pawns')
  })

  it('describes a swing into mate in words instead of the internal sentinel value', () => {
    // The 98_810 swingCp here is evalToCp's internal ±100,000 mate sentinel
    // at work, not a real pawn count — formatSwing must not display it raw.
    expect(formatSwing(blunder(cp(1190), mate(7), 98_810))).toBe('white has a forced mate')
  })

  it('describes a swing out of a mate in words too', () => {
    expect(formatSwing(blunder(mate(-2), cp(20), 99_980))).toBe('equal position')
  })

  it('formats an ordinary swing in Spanish', () => {
    expect(formatSwing(blunder(cp(370), cp(580), 210), 'es')).toBe('2.1 peones')
  })
})
