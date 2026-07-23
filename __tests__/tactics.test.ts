import { describe, expect, it } from 'vitest'
import {
  describeBetterMove,
  describeBlunderReason,
  describeForkReason,
  detectBlunderReason,
  detectFork,
  explainBestMove,
} from '@/lib/tactics'
import type { BestMove } from '@/lib/types'

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

describe('explainBestMove', () => {
  it('explains that the suggested move saves a piece that was hanging', () => {
    // The knight on f3 is already hanging to the bishop on b7 — Nd4 steps
    // off the a8-h1 diagonal to safety.
    const fen = 'k7/1b6/8/8/8/5N2/8/4K3 w - - 0 1'
    expect(explainBestMove(fen, 'Nd4', 'white')).toBe('Saves the knight on f3, which was hanging.')
  })

  it('explains that the suggested move escapes an existing fork', () => {
    // White's knight on d5 already forks the queen (c7) and rook (b4) — a
    // bishop on d6 individually defends both, so neither is independently
    // "hanging" (isolating this from the saves-a-hanging-piece branch above).
    // Qc8 pulls the queen out of the fork's range.
    const fen = '6k1/2q5/3b4/3N4/1r6/8/8/6K1 b - - 0 1'
    const explanation = explainBestMove(fen, 'Qc8', 'black')
    expect(explanation).toMatch(/^Gets .+ out of the fork\.$/)
    expect(explanation).toContain('the queen on c7')
    expect(explanation).toContain('the rook on b4')
  })

  it('explains that the suggested move wins material by attacking a hanging enemy piece', () => {
    // The rook on b1 doesn't yet attack the undefended knight on a7; Ra1
    // moves onto the open a-file and newly attacks it.
    const fen = '7k/n7/8/8/8/8/8/1R4K1 w - - 0 1'
    expect(explainBestMove(fen, 'Ra1', 'white')).toBe("Leaves the opponent's knight on a7 hanging.")
  })

  it('explains that the suggested move creates a new fork', () => {
    // The knight on d4 (safe from both the queen and rook, unlike c3 which
    // sits on the queen's file) doesn't yet fork anything; Nb5 newly
    // attacks both the queen (c7) and the rook (a7) at once. The queen and
    // rook mutually defend each other along the 7th rank, so neither is
    // independently hanging — isolating this from the wins-material branch.
    const fen = '6k1/r1q5/8/8/3N4/8/8/6K1 w - - 0 1'
    const explanation = explainBestMove(fen, 'Nb5', 'white')
    expect(explanation).toMatch(/^Forks .+ at once\.$/)
    expect(explanation).toContain('the queen on c7')
    expect(explanation).toContain('the rook on a7')
  })

  it('returns null for a quiet move none of the heuristics explain', () => {
    const fen = '7k/8/8/8/8/8/8/R6K w - - 0 1'
    expect(explainBestMove(fen, 'Ra5', 'white')).toBeNull()
  })
})

describe('describeBetterMove', () => {
  const fen = 'r5k1/2q5/8/1N6/8/8/8/6K1 w - - 0 1'

  it('returns null when there is no engine suggestion', () => {
    expect(describeBetterMove(fen, 'Kg2', null, 'white')).toBeNull()
  })

  it('returns null when the suggestion matches what was actually played', () => {
    expect(
      describeBetterMove(fen, 'Kg2', { from: 'g1', to: 'g2', san: 'Kg2', bestLine: [] }, 'white'),
    ).toBeNull()
  })

  it('combines the mechanical description with a tactical explanation when one applies', () => {
    const before = '7k/n7/8/8/8/8/8/1R4K1 w - - 0 1'
    expect(
      describeBetterMove(
        before,
        'Kg2',
        { from: 'b1', to: 'a1', san: 'Ra1', bestLine: [] },
        'white',
      ),
    ).toBe("Ra1 (Rook to a1) — Leaves the opponent's knight on a7 hanging.")
  })

  it('omits the explanation clause when no tactical pattern applies', () => {
    const before = '7k/8/8/8/8/8/8/R6K w - - 0 1'
    expect(
      describeBetterMove(
        before,
        'Kg2',
        { from: 'a1', to: 'a5', san: 'Ra5', bestLine: [] },
        'white',
      ),
    ).toBe('Ra5 (Rook to a5)')
  })

  it('appends the engine plan when the suggestion has one', () => {
    const before = '7k/8/8/8/8/8/8/R6K w - - 0 1'
    expect(
      describeBetterMove(
        before,
        'Kg2',
        { from: 'a1', to: 'a5', san: 'Ra5', bestLine: ['Kg8', 'Ra7'] },
        'white',
      ),
    ).toBe('Ra5 (Rook to a5) — Plan: Kg8 Ra7.')
  })

  it('combines a tactical explanation with the engine plan when both are present', () => {
    const before = '7k/n7/8/8/8/8/8/1R4K1 w - - 0 1'
    expect(
      describeBetterMove(
        before,
        'Kg2',
        { from: 'b1', to: 'a1', san: 'Ra1', bestLine: ['Nb5', 'Rxb5'] },
        'white',
      ),
    ).toBe("Ra1 (Rook to a1) — Leaves the opponent's knight on a7 hanging. Plan: Nb5 Rxb5.")
  })

  it('omits the plan clause for a game_analysis row saved before bestLine existed', () => {
    // Real old data: `bestLine` is entirely absent from the stored JSON, not
    // an empty array — `as BestMove` simulates that shape past the type
    // system, which (correctly) no longer allows constructing this literal
    // directly. Regression test for a crash this exact shape caused in
    // Board.tsx/GameAnalysisPanel.tsx (`bestLine.length` with no `?.`).
    const before = '7k/8/8/8/8/8/8/R6K w - - 0 1'
    const oldBestMove = { from: 'a1', to: 'a5', san: 'Ra5' } as BestMove
    expect(describeBetterMove(before, 'Kg2', oldBestMove, 'white')).toBe('Ra5 (Rook to a5)')
  })
})
