import { describe, expect, it } from 'vitest'
import {
  detectBlunderReason,
  describeBlunderReason,
  describeForkReason,
  detectFork,
} from '@/lib/tactics'

describe('detectFork', () => {
  it('flags a piece newly attacking 2+ enemy pieces at once', () => {
    // White knight on b5 already attacks the queen on c7; black's own
    // Ra8-a7 walks the rook into the knight's fork range too.
    const before = 'r5k1/2q5/8/1N6/8/8/8/6K1 b - - 0 1'
    const after = '6k1/r1q5/8/1N6/8/8/8/6K1 w - - 0 1'
    const reason = detectFork(before, after, 'black')
    expect(reason?.attackerPiece).toBe('n')
    expect(reason?.attackerSquare).toBe('b5')
    expect(reason?.targets.sort((a, b) => a.square.localeCompare(b.square))).toEqual([
      { piece: 'r', square: 'a7' },
      { piece: 'q', square: 'c7' },
    ])
  })

  it('ignores a fork that already existed before the move', () => {
    const fen = '6k1/r1q5/8/1N6/8/8/8/6K1 b - - 0 1'
    const after = '7k/r1q5/8/1N6/8/8/8/6K1 w - - 0 1'
    expect(detectFork(fen, after, 'black')).toBeNull()
  })

  it('does not flag a fork whose targets are all pawns', () => {
    // The rook already attacks the d7 pawn; black's own a5-a4 push adds a
    // second target along the rank, but both targets are pawns.
    const before = '7k/3p4/8/p7/3R4/8/8/7K b - - 0 1'
    const after = '7k/3p4/8/8/p2R4/8/8/7K w - - 0 1'
    expect(detectFork(before, after, 'black')).toBeNull()
  })
})

describe('describeForkReason', () => {
  it('formats a plain-English fork message', () => {
    expect(
      describeForkReason({
        kind: 'fork',
        attackerPiece: 'n',
        attackerSquare: 'b5',
        targets: [
          { piece: 'q', square: 'c7' },
          { piece: 'r', square: 'a7' },
        ],
      }),
    ).toBe(
      'This allows a fork — the knight on b5 now attacks the queen on c7 and the rook on a7 at once.',
    )
  })
})

describe('detectBlunderReason', () => {
  it('returns a hanging-piece reason when one applies', () => {
    const before = 'k7/1b6/8/8/8/8/3N4/4K3 w - - 0 1'
    const after = 'k7/1b6/8/8/8/5N2/8/4K3 w - - 0 1'
    expect(detectBlunderReason(before, after, 'white')).toEqual({
      kind: 'hanging-piece',
      piece: 'n',
      square: 'f3',
    })
  })

  it('falls back to a fork reason when no piece is left hanging', () => {
    const before = 'r5k1/2q5/8/1N6/8/8/8/6K1 b - - 0 1'
    const after = '6k1/r1q5/8/1N6/8/8/8/6K1 w - - 0 1'
    expect(detectBlunderReason(before, after, 'black')).toMatchObject({ kind: 'fork' })
  })

  it('returns null when neither pattern applies', () => {
    const fen = 'k7/8/8/8/8/8/8/4K3 w - - 0 1'
    expect(detectBlunderReason(fen, fen, 'white')).toBeNull()
  })
})

describe('describeBlunderReason', () => {
  it('dispatches to the hanging-piece description', () => {
    expect(describeBlunderReason({ kind: 'hanging-piece', piece: 'q', square: 'd5' })).toBe(
      'This leaves the queen on d5 hanging — it can be captured for free.',
    )
  })

  it('dispatches to the fork description', () => {
    expect(
      describeBlunderReason({
        kind: 'fork',
        attackerPiece: 'n',
        attackerSquare: 'b5',
        targets: [{ piece: 'q', square: 'c7' }],
      }),
    ).toBe('This allows a fork — the knight on b5 now attacks the queen on c7 at once.')
  })
})
