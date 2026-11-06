import { describe, expect, it } from 'vitest'
import { clockShareBeforePly, initialClockSeconds, plyClocks } from '@/lib/clock'

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
})
