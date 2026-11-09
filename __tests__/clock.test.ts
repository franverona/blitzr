import { describe, expect, it } from 'vitest'
import {
  clockIncrementSeconds,
  clockShareBeforePly,
  formatClock,
  formatThinkTime,
  initialClockSeconds,
  moveClocks,
  plyClocks,
  thinkSecondsForPly,
} from '@/lib/clock'

describe('initialClockSeconds', () => {
  it('reads the base time and skips daily or unknown controls', () => {
    expect(initialClockSeconds('600')).toBe(600)
    expect(initialClockSeconds('180+2')).toBe(180)
    expect(initialClockSeconds('-')).toBeNull()
    expect(initialClockSeconds('1/86400')).toBeNull()
    expect(initialClockSeconds('')).toBeNull()
  })
})

describe('plyClocks', () => {
  it("reads each ply's clock, or nothing when a ply lacks one", () => {
    const pgn = '1. e4 {[%clk 0:09:57.1]} 1... d5 { [%clk 0:10:00] } 2. exd5 {[%clk 1:00:01]} *'
    expect(plyClocks(pgn, 3)).toEqual([597.1, 600, 3601])
    expect(plyClocks(pgn, 4)).toBeNull()
    expect(plyClocks('1. e4 d5 *', 2)).toBeNull()
  })
})

describe('clockShareBeforePly', () => {
  it("uses the mover's clock after their previous move, all of it before their first", () => {
    const clocks = [590, 600, 300, 450]
    expect(clockShareBeforePly(clocks, 1, 600)).toBe(1)
    expect(clockShareBeforePly(clocks, 2, 600)).toBe(1)
    expect(clockShareBeforePly(clocks, 3, 600)).toBeCloseTo(590 / 600)
    expect(clockShareBeforePly(clocks, 5, 600)).toBe(0.5)
  })

  it("measures a berserker's share against their halved start", () => {
    // Black berserked a 3+0 game: 90 seconds, no increment.
    const clocks = [180, 90, 170, 60, 160, 40]
    expect(clockShareBeforePly(clocks, 4, 180)).toBe(1)
    expect(clockShareBeforePly(clocks, 6, 180)).toBeCloseTo(60 / 90)
    expect(clockShareBeforePly(clocks, 5, 180)).toBeCloseTo(170 / 180)
  })
})

describe('clockIncrementSeconds', () => {
  it('reads the increment, 0 without one', () => {
    expect(clockIncrementSeconds('180+2')).toBe(2)
    expect(clockIncrementSeconds('600')).toBe(0)
    expect(clockIncrementSeconds('-')).toBe(0)
  })
})

describe('thinkSecondsForPly', () => {
  it("takes the mover's clock before, minus after, plus the increment", () => {
    // 3+2: White's first move took 5s, Black's 3s, White's second 22s.
    const clocks = [177, 179, 157, 175]
    expect(thinkSecondsForPly(clocks, 1, 180, 2)).toBe(5)
    expect(thinkSecondsForPly(clocks, 2, 180, 2)).toBe(3)
    expect(thinkSecondsForPly(clocks, 3, 180, 2)).toBe(22)
    expect(thinkSecondsForPly(clocks, 4, 180, 2)).toBe(6)
  })

  it("counts a first move that left the clock untouched as instant, as Lichess's are", () => {
    const clocks = [300, 300, 302, 301]
    expect(thinkSecondsForPly(clocks, 1, 300, 3)).toBe(0)
    expect(thinkSecondsForPly(clocks, 2, 300, 3)).toBe(0)
    expect(thinkSecondsForPly(clocks, 3, 300, 3)).toBe(1)
  })

  it('starts a berserker on half the time, with no increment', () => {
    const clocks = [182, 90, 170, 80]
    expect(thinkSecondsForPly(clocks, 2, 180, 2)).toBe(0)
    expect(thinkSecondsForPly(clocks, 4, 180, 2)).toBe(10)
  })
})

describe('formatClock and formatThinkTime', () => {
  it('reads like a clock', () => {
    expect(formatClock(125.7)).toBe('2:05')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatThinkTime(0.42)).toBe('0.4s')
    expect(formatThinkTime(12.4)).toBe('12s')
    expect(formatThinkTime(65)).toBe('1:05')
  })
})

describe('moveClocks', () => {
  it("gives every ply's think time and clock, only in a game clocked on every ply", () => {
    const pgn = '1. e4 {[%clk 0:02:57]} 1... e5 {[%clk 0:02:59]} *'
    expect(moveClocks(pgn, 2, '180+2')).toEqual([
      { spent: 5, left: 177 },
      { spent: 3, left: 179 },
    ])
    expect(moveClocks(pgn, 3, '180+2')).toBeUndefined()
    expect(moveClocks(pgn, 2, '1/86400')).toBeUndefined()
  })
})
