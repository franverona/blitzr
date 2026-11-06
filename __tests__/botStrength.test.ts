import { describe, expect, it } from 'vitest'
import {
  BOT_ELOS,
  botUciOptions,
  isApproximateElo,
  isBotElo,
  nearestBotElo,
} from '@/lib/botStrength'

describe('botUciOptions', () => {
  it('uses Skill Level under the UCI_Elo floor', () => {
    expect(botUciOptions(800)).toEqual(['setoption name Skill Level value 0'])
    expect(isApproximateElo(1200)).toBe(true)
  })

  it('uses UCI_Elo from 1400 up', () => {
    expect(botUciOptions(1600)).toEqual([
      'setoption name UCI_LimitStrength value true',
      'setoption name UCI_Elo value 1600',
    ])
    expect(isApproximateElo(1400)).toBe(false)
  })

  it('gives every level some options', () => {
    for (const elo of BOT_ELOS) expect(botUciOptions(elo).length).toBeGreaterThan(0)
  })
})

describe('isBotElo', () => {
  it('accepts only listed levels', () => {
    expect(isBotElo(1400)).toBe(true)
    expect(isBotElo(1500)).toBe(false)
    expect(isBotElo('1400')).toBe(false)
  })
})

describe('nearestBotElo', () => {
  it('picks the closest level, the lower on a tie, and the default without a rating', () => {
    expect(nearestBotElo(1530)).toBe(1600)
    expect(nearestBotElo(1500)).toBe(1400)
    expect(nearestBotElo(300)).toBe(800)
    expect(nearestBotElo(3100)).toBe(2500)
    expect(nearestBotElo(null)).toBe(1200)
  })
})
