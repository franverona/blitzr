import { describe, expect, it } from 'vitest'
import { describeHangingPieceReason, detectHangingPiece, hangingSquares } from '@/lib/hangingPiece'

describe('detectHangingPiece', () => {
  it('flags a piece that moved onto an attacked, undefended square', () => {
    // Black bishop on b7 covers the a8-h1 diagonal, including f3.
    const before = 'k7/1b6/8/8/8/8/3N4/4K3 w - - 0 1'
    const after = 'k7/1b6/8/8/8/5N2/8/4K3 w - - 0 1'
    expect(detectHangingPiece(before, after, 'white')).toEqual({
      kind: 'hanging-piece',
      piece: 'n',
      square: 'f3',
    })
  })

  it('does not flag a piece defended by another of its own pieces', () => {
    const before = 'k7/1b6/8/8/8/8/3N4/4K3 w - - 0 1'
    // A white pawn on g2 defends f3 (pawns capture diagonally forward).
    const after = 'k7/1b6/8/8/8/5N2/6P1/4K3 w - - 0 1'
    expect(detectHangingPiece(before, after, 'white')).toBeNull()
  })

  it('ignores a piece that was already hanging before the move', () => {
    const fen = 'k7/1b6/8/8/8/5N2/8/4K3 w - - 0 1'
    expect(detectHangingPiece(fen, fen, 'white')).toBeNull()
  })

  it('detects a discovered hang when a defender moves away', () => {
    // Black bishop a1 attacks d4 along a1-b2-c3-d4; knight c2 defends d4
    // until it moves to e3, which doesn't.
    const before = '6k1/8/8/8/3R4/8/2N5/b5K1 w - - 0 1'
    const after = '6k1/8/8/8/3R4/4N3/8/b5K1 w - - 0 1'
    expect(detectHangingPiece(before, after, 'white')).toEqual({
      kind: 'hanging-piece',
      piece: 'r',
      square: 'd4',
    })
  })

  it('reports the higher-value piece when two are newly hanging at once', () => {
    const before = '7k/8/8/8/8/2N2R2/8/7K w - - 0 1'
    // Black rooks on c8/f8 newly attack the knight (c3) and rook (f3).
    const after = '2r2r1k/8/8/8/8/2N2R2/8/7K w - - 0 1'
    expect(detectHangingPiece(before, after, 'white')).toEqual({
      kind: 'hanging-piece',
      piece: 'r',
      square: 'f3',
    })
  })

  it('flags a defended piece attacked by a cheaper one', () => {
    // The queen goes to d4: the c3 pawn defends it, but the e5 pawn attacks it.
    const before = 'k7/8/8/4p3/8/2P5/8/3QK3 w - - 0 1'
    const after = 'k7/8/8/4p3/3Q4/2P5/8/4K3 w - - 0 1'
    expect(detectHangingPiece(before, after, 'white')).toEqual({
      kind: 'hanging-piece',
      piece: 'q',
      square: 'd4',
      attacker: { piece: 'p', square: 'e5' },
    })
  })

  it('does not flag a defended piece attacked by one of equal value', () => {
    // Knight c4, defended by the b3 pawn, attacked by the b5 bishop: a fair trade.
    expect(hangingSquares('k7/8/8/1b6/2N5/1P6/8/4K3 w - - 0 1', 'w').size).toBe(0)
  })

  it('flags a piece that goes from attacked-by-cheaper to undefended', () => {
    // The rook on d4 is already attacked by the cheaper a1 bishop; the knight leaving c2
    // takes away its defender, so it's now free.
    const before = '6k1/8/8/8/3R4/8/2N5/b5K1 w - - 0 1'
    const after = '6k1/8/8/8/3R4/4N3/8/b5K1 w - - 0 1'
    expect(detectHangingPiece(before, after, 'white')).toMatchObject({
      piece: 'r',
      square: 'd4',
    })
    expect(detectHangingPiece(before, after, 'white')?.attacker).toBeUndefined()
  })

  it('never reports the king itself as hanging', () => {
    const fen = '4r2k/8/8/8/8/8/8/4K3 w - - 0 1'
    expect(detectHangingPiece(fen, fen, 'white')).toBeNull()
  })
})

describe('describeHangingPieceReason', () => {
  it('formats a plain-English hanging-piece message', () => {
    expect(describeHangingPieceReason({ kind: 'hanging-piece', piece: 'n', square: 'f3' })).toBe(
      'This leaves the knight on f3 hanging — it can be captured for free.',
    )
    expect(describeHangingPieceReason({ kind: 'hanging-piece', piece: 'q', square: 'd5' })).toBe(
      'This leaves the queen on d5 hanging — it can be captured for free.',
    )
  })

  it('says a defended piece loses material to a cheaper attacker', () => {
    const reason = {
      kind: 'hanging-piece' as const,
      piece: 'q',
      square: 'd4',
      attacker: { piece: 'p', square: 'e5' },
    }
    expect(describeHangingPieceReason(reason)).toBe(
      "This leaves the queen on d4 attacked by the pawn on e5, which is worth less — it loses material even though it's defended.",
    )
    expect(describeHangingPieceReason(reason, 'es')).toBe(
      'Esto deja la dama en d4 atacada por el peón en e5, que vale menos — se pierde material aunque esté defendida.',
    )
  })

  it('formats a plain-Spanish hanging-piece message', () => {
    expect(
      describeHangingPieceReason({ kind: 'hanging-piece', piece: 'n', square: 'f3' }, 'es'),
    ).toBe('Esto deja el caballo en f3 colgando — se puede capturar gratis.')
    expect(
      describeHangingPieceReason({ kind: 'hanging-piece', piece: 'q', square: 'd5' }, 'es'),
    ).toBe('Esto deja la dama en d5 colgando — se puede capturar gratis.')
  })
})
