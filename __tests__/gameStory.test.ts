import { describe, expect, it } from 'vitest'
import { buildGameStory, standingFor } from '@/lib/gameStory'
import { buildPositions, START_FEN } from '@/lib/positions'
import type { PositionEval } from '@/lib/types'

const cp = (value: number): PositionEval => ({ cp: value, mate: null, bestMove: null })
const mate = (moves: number): PositionEval => ({ cp: null, mate: moves, bestMove: null })

// Scholar's mate: White mates on move 4.
const MOVES = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']
const POSITIONS = buildPositions(START_FEN, MOVES)

describe('standingFor', () => {
  it('reads the eval from the user’s side', () => {
    expect(standingFor(cp(30), 'white')).toBe('equal')
    expect(standingFor(cp(100), 'white')).toBe('edge')
    expect(standingFor(cp(200), 'white')).toBe('better')
    expect(standingFor(cp(200), 'black')).toBe('worse')
    expect(standingFor(mate(2), 'black')).toBe('lost')
    expect(standingFor(mate(-1), 'black')).toBe('crushing')
  })

  it('matches the eval text under the board', () => {
    // A game's +8.3 → +5.8 was reported as merely "a bit better".
    expect(standingFor(cp(834), 'white')).toBe('crushing')
    expect(standingFor(cp(579), 'white')).toBe('winning')
  })
})

describe('buildGameStory', () => {
  // Black's Nf6 (ply 6) walks into mate.
  const evals = [cp(30), cp(30), cp(30), cp(30), cp(30), cp(30), mate(1), mate(1)]

  it('narrates the blunder that turned the game, with its best alternative', () => {
    const withBest = [...evals]
    withBest[5] = { ...cp(30), bestMove: { from: 'd8', to: 'e7', san: 'Qe7', bestLine: [] } }
    const story = buildGameStory(withBest, MOVES, POSITIONS, 'black', false, {
      white: 'win',
      black: 'checkmated',
    })
    expect(story.turningPoints).toEqual([
      expect.objectContaining({
        ply: 6,
        san: 'Nf6',
        mine: true,
        tier: 'blunder',
        before: 'equal',
        after: 'lost',
        bestSan: 'Qe7',
        missedChance: false,
      }),
    ])
    expect(story.endReason).toBe('checkmate')
    expect(story.finalStanding).toBe('lost')
    expect(story.slippedWin).toBeNull()
    // Never out of the opening.
    expect(story.afterOpening).toBeNull()
  })

  it('tells the opponent’s turning point and a slipped win apart', () => {
    const story = buildGameStory(evals, MOVES, POSITIONS, 'white', false, {
      white: 'agreed',
      black: 'agreed',
    })
    expect(story.turningPoints[0]).toMatchObject({ ply: 6, mine: false })
    // Peak is the mate-in-1 position, before White's (mating) move.
    expect(story.slippedWin).toEqual({ ply: 6 })
  })

  it('skips a slip that leaves the user as far ahead', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6']
    // +8.3 → +5.8: clearly winning to winning, still a win.
    const story = buildGameStory(
      [cp(834), cp(834), cp(834), cp(579), cp(579)],
      moves,
      buildPositions(START_FEN, moves),
      'white',
      true,
    )
    expect(story.turningPoints).toEqual([])
  })

  it('flags a move that hands back the opponent’s gift', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6']
    // Black errs on ply 2, White gives it straight back on ply 3.
    const story = buildGameStory(
      [cp(30), cp(30), cp(400), cp(-400), cp(-400)],
      moves,
      buildPositions(START_FEN, moves),
      'white',
      false,
    )
    expect(story.turningPoints.map((tp) => [tp.ply, tp.mine, tp.missedChance])).toEqual([
      [2, false, false],
      [3, true, true],
    ])
  })
})
