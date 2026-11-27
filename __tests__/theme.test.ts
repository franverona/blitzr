import { describe, expect, it } from 'vitest'
import {
  BOARD_ANIMATION_DURATION_MS,
  getPieceSet,
  getPlaySpeed,
  getTrainingOrientation,
  pieceImageUrl,
  PLAY_SPEEDS,
  resolveOrientation,
} from '@/lib/theme'

describe('training orientation', () => {
  it('parses the cookie, defaulting to auto', () => {
    expect(getTrainingOrientation('black')).toBe('black')
    expect(getTrainingOrientation(undefined)).toBe('auto')
    expect(getTrainingOrientation('sideways')).toBe('auto')
  })

  it('uses the side to play only on auto', () => {
    expect(resolveOrientation('auto', 'black')).toBe('black')
    expect(resolveOrientation('white', 'black')).toBe('white')
  })
})

describe('play speed', () => {
  it('parses the cookie, defaulting to normal', () => {
    expect(getPlaySpeed('fast')).toBe('fast')
    expect(getPlaySpeed(undefined)).toBe('normal')
    expect(getPlaySpeed('ludicrous')).toBe('normal')
  })

  it('never steps faster than a move animates', () => {
    expect(Math.min(...Object.values(PLAY_SPEEDS))).toBeGreaterThan(BOARD_ANIMATION_DURATION_MS)
  })
})

describe('piece sets', () => {
  it('parses the cookie, defaulting to the built-in set', () => {
    expect(getPieceSet('merida')).toBe('merida')
    expect(getPieceSet(undefined)).toBe('default')
    expect(getPieceSet('comic-sans')).toBe('default')
  })

  it('builds the Lichess image URL from the board piece key', () => {
    expect(pieceImageUrl('alpha', 'bQ')).toBe('https://lichess1.org/assets/piece/alpha/bQ.svg')
  })
})
