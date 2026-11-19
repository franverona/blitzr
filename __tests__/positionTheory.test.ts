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
  it('cites an https source the lesson dialog can name by host', () => {
    for (const lesson of POSITION_LESSONS)
      expect(new URL(lesson.sourceUrl).protocol, lesson.slug).toBe('https:')
  })

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

  it('the wrong-rook-pawn line ends in stalemate', () => {
    expect(playOut('wrong-rook-pawn').isStalemate()).toBe(true)
  })

  it('the rook-behind-the-passed-pawn line ends in mate', () => {
    expect(playOut('rook-behind-passed-pawn').isCheckmate()).toBe(true)
  })

  it("outflanking ends with White's king ahead of its pawn on the sixth rank", () => {
    const chess = playOut('outflanking')
    expect(chess.get('b6')).toEqual({ type: 'k', color: 'w' })
    expect(chess.get('c2')).toEqual({ type: 'p', color: 'w' })
  })

  it('shouldering ends with the pawn promoted', () => {
    expect(playOut('shouldering').get('a8')).toEqual({ type: 'q', color: 'w' })
  })

  it('the knight-stops-pawn line ends in a bare-kings draw', () => {
    expect(playOut('knight-stops-pawn').isInsufficientMaterial()).toBe(true)
  })

  it('two pawns vs one promotes the pawn left after the break', () => {
    expect(playOut('two-pawns-vs-one').get('g8')).toEqual({ type: 'q', color: 'w' })
  })

  it('connected pawns vs rook ends with White queen against bare king', () => {
    const chess = playOut('connected-pawns-vs-rook')
    expect(chess.get('f8')).toEqual({ type: 'q', color: 'w' })
    expect(
      chess
        .board()
        .flat()
        .filter((sq) => sq?.color === 'b'),
    ).toHaveLength(1)
  })

  it('rook vs bishop: a rook move along the back rank after Bb8 is stalemate', () => {
    const lesson = getPositionLesson('rook-vs-bishop')!
    const chess = new Chess(lesson.initialFen)
    for (const move of lesson.moves.slice(0, 2)) chess.move(move.san)
    chess.move('Rg8')
    expect(chess.isStalemate()).toBe(true)
  })

  it('bishop vs knight: after Be5 every knight move can be captured, and the pawn queens', () => {
    const lesson = getPositionLesson('bishop-vs-knight')!
    const chess = new Chess(lesson.initialFen)
    chess.move('Be5')
    const bishopCovers = new Set(['f4', 'g3', 'f6', 'g7'])
    for (const m of chess.moves({ square: 'h5', verbose: true }))
      expect(bishopCovers.has(m.to)).toBe(true)
    expect(playOut('bishop-vs-knight').get('d8')).toEqual({ type: 'q', color: 'w' })
  })

  it('queen and pawn vs queen ends with the pawn promoted to a second queen', () => {
    const chess = playOut('queen-and-pawn-vs-queen')
    expect(chess.get('h8')).toEqual({ type: 'q', color: 'w' })
    expect(chess.get('f8')).toEqual({ type: 'q', color: 'w' })
  })

  it("defending from behind ends with Black's rook back behind the pawn", () => {
    const chess = playOut('defending-from-behind')
    expect(chess.get('b3')).toEqual({ type: 'r', color: 'b' })
    expect(chess.get('b7')).toEqual({ type: 'p', color: 'w' })
  })

  it('the pawn breakthrough promotes, and so does its 1...cxb6 mirror line', () => {
    expect(playOut('pawn-breakthrough').get('a8')).toEqual({ type: 'q', color: 'w' })
    const chess = new Chess(getPositionLesson('pawn-breakthrough')!.initialFen)
    for (const san of ['b6', 'cxb6', 'a6', 'bxa6', 'c6', 'a5', 'c7', 'a4', 'c8=Q+']) chess.move(san)
    expect(chess.get('c8')).toEqual({ type: 'q', color: 'w' })
  })

  it('Saavedra: promoting to a queen instead falls into the stalemate trap', () => {
    const lesson = getPositionLesson('saavedra-position')!
    const chess = new Chess(lesson.initialFen)
    for (const move of lesson.moves.slice(0, 10)) chess.move(move.san)
    for (const san of ['c8=Q', 'Rc4+', 'Qxc4']) chess.move(san)
    expect(chess.isStalemate()).toBe(true)
  })

  it('queen vs bishop pawn: taking the pawn at the end is stalemate', () => {
    const chess = playOut('queen-vs-bishop-pawn')
    chess.move('Qxc2')
    expect(chess.isStalemate()).toBe(true)
  })

  it('trébuchet: White has won the pawn and keeps its own', () => {
    const chess = playOut('trebuchet')
    expect(chess.get('d4')).toEqual({ type: 'p', color: 'w' })
    expect(chess.get('d5')).toEqual({ type: 'k', color: 'w' })
  })

  it('the rook-pawn draw ends in stalemate', () => {
    expect(playOut('rook-pawn-draw').isStalemate()).toBe(true)
  })

  it('rule of the square: the king catches the pawn, leaving bare kings', () => {
    expect(playOut('rule-of-the-square').isInsufficientMaterial()).toBe(true)
  })

  it('queen vs rook ends in a check that also attacks the rook', () => {
    const chess = playOut('queen-vs-rook')
    expect(chess.inCheck()).toBe(true)
    expect(chess.attackers('b1', 'w')).toContain('h7')
  })

  it("cutting off the king: the pawn reaches the seventh, still White's", () => {
    expect(playOut('cutting-off-the-king').get('d7')).toEqual({ type: 'p', color: 'w' })
  })

  it('key squares: the white king reaches b5', () => {
    expect(playOut('key-squares').get('b5')).toEqual({ type: 'k', color: 'w' })
  })

  it('no slug collides with another lesson kind', async () => {
    const { OPENING_LESSONS } = await import('@/lib/openingTheory')
    const { ENDGAME_LESSONS } = await import('@/lib/endgameTheory')
    const others = new Set([...OPENING_LESSONS, ...ENDGAME_LESSONS].map((l) => l.slug))
    for (const lesson of POSITION_LESSONS) expect(others.has(lesson.slug)).toBe(false)
  })
})
