import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { getPositionLesson, POSITION_LESSONS } from '@/lib/positionTheory'

function playOut(slug: string): Chess {
  const lesson = getPositionLesson(slug)!
  const chess = new Chess(lesson.initialFen)
  for (const move of lesson.moves) chess.move(move.san)
  return chess
}

describe('getPositionLesson', () => {
  it('finds a lesson by slug', () => {
    expect(getPositionLesson('philidor-position')).toBe(POSITION_LESSONS[0])
  })

  it('returns undefined for an unknown slug', () => {
    expect(getPositionLesson('not-a-real-position')).toBeUndefined()
  })
})

describe('POSITION_LESSONS content', () => {
  it('has a distinct, non-empty English and Spanish name, summary and explanation', () => {
    for (const lesson of POSITION_LESSONS) {
      expect(lesson.name.es).not.toBe(lesson.name.en)
      expect(lesson.summary.en.length).toBeGreaterThan(0)
      expect(lesson.summary.es.length).toBeGreaterThan(0)
      for (const move of lesson.moves) {
        expect(move.explanation.en.length).toBeGreaterThan(0)
        expect(move.explanation.es).not.toBe(move.explanation.en)
      }
    }
  })

  it('plays out as a fully legal move sequence from its own starting position', () => {
    for (const lesson of POSITION_LESSONS) {
      const chess = new Chess(lesson.initialFen)
      for (const move of lesson.moves) {
        expect(() => chess.move(move.san), `${lesson.slug}: ${move.san}`).not.toThrow()
      }
    }
  })

  it('Philidor ends with Black still checking and the pawn not yet promoted', () => {
    const chess = playOut('philidor-position')
    expect(chess.inCheck()).toBe(true)
    expect(chess.turn()).toBe('w')
    expect(chess.get('e6')).toEqual({ type: 'p', color: 'w' })
  })

  it("Réti's study ends in a bare-kings draw", () => {
    expect(playOut('reti-study').isInsufficientMaterial()).toBe(true)
  })

  it('no slug collides with another lesson kind', async () => {
    const { OPENING_LESSONS } = await import('@/lib/openingTheory')
    const { ENDGAME_LESSONS } = await import('@/lib/endgameTheory')
    const others = new Set([...OPENING_LESSONS, ...ENDGAME_LESSONS].map((l) => l.slug))
    for (const lesson of POSITION_LESSONS) expect(others.has(lesson.slug)).toBe(false)
  })
})
