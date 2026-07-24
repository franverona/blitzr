import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { ENDGAME_LESSONS, getEndgameLesson } from '@/lib/endgameTheory'

describe('getEndgameLesson', () => {
  it('finds a lesson by slug', () => {
    expect(getEndgameLesson('king-and-queen-vs-king')).toBe(ENDGAME_LESSONS[0])
  })

  it('returns undefined for an unknown slug', () => {
    expect(getEndgameLesson('not-a-real-endgame')).toBeUndefined()
  })
})

describe('ENDGAME_LESSONS content', () => {
  it('has a distinct, non-empty English and Spanish name/summary for every lesson', () => {
    for (const lesson of ENDGAME_LESSONS) {
      expect(lesson.name.en.length).toBeGreaterThan(0)
      expect(lesson.name.es.length).toBeGreaterThan(0)
      expect(lesson.summary.en.length).toBeGreaterThan(0)
      expect(lesson.summary.es.length).toBeGreaterThan(0)
      expect(lesson.name.es).not.toBe(lesson.name.en)
    }
  })

  it('has a distinct, non-empty English and Spanish explanation for every move', () => {
    for (const lesson of ENDGAME_LESSONS) {
      for (const move of lesson.moves) {
        expect(move.explanation.en.length).toBeGreaterThan(0)
        expect(move.explanation.es.length).toBeGreaterThan(0)
        expect(move.explanation.es).not.toBe(move.explanation.en)
      }
    }
  })

  it('plays out as a fully legal move sequence from its own starting position', () => {
    for (const lesson of ENDGAME_LESSONS) {
      const chess = new Chess(lesson.initialFen)
      for (const move of lesson.moves) {
        expect(() => chess.move(move.san), `${lesson.slug}: ${move.san}`).not.toThrow()
      }
    }
  })

  it('the two mating lessons actually end in checkmate', () => {
    for (const slug of ['king-and-queen-vs-king', 'king-and-rook-vs-king']) {
      const lesson = getEndgameLesson(slug)!
      const chess = new Chess(lesson.initialFen)
      for (const move of lesson.moves) chess.move(move.san)
      expect(chess.isCheckmate(), slug).toBe(true)
    }
  })

  it('the pawn-ending lesson actually promotes the pawn', () => {
    const lesson = getEndgameLesson('king-and-pawn-vs-king')!
    const before = new Chess(lesson.initialFen)
    expect(
      before
        .board()
        .flat()
        .some((sq) => sq?.type === 'q'),
    ).toBe(false)

    const chess = new Chess(lesson.initialFen)
    for (const move of lesson.moves) chess.move(move.san)
    expect(
      chess
        .board()
        .flat()
        .some((sq) => sq?.type === 'q' && sq.color === 'w'),
    ).toBe(true)
  })
})
