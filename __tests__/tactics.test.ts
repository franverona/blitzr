import { describe, expect, it } from 'vitest'
import {
  describeBetterMove,
  describeBlunderReason,
  describeForkReason,
  describePinReason,
  describeSkewerReason,
  detectBlunderReason,
  detectFork,
  detectPin,
  detectSkewer,
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

describe('describeForkReason (Spanish)', () => {
  it('formats a plain-Spanish fork message', () => {
    expect(
      describeForkReason(
        {
          kind: 'fork',
          attackerPiece: 'n',
          attackerSquare: 'b5',
          targets: [
            { piece: 'q', square: 'c7' },
            { piece: 'r', square: 'a7' },
          ],
        },
        'es',
      ),
    ).toBe(
      'Esto permite una horquilla — el caballo en b5 ahora ataca la dama en c7 y la torre en a7 a la vez.',
    )
  })
})

describe('detectPin', () => {
  it('flags a piece newly pinned to its own king by an enemy slider', () => {
    // Black knight steps from f8 (safe) to e6, walking onto the c4-g8
    // diagonal a white bishop already occupies the near end of.
    const before = '5nk1/8/8/8/2B5/8/8/K7 b - - 0 1'
    const after = '6k1/8/4n3/8/2B5/8/8/K7 w - - 0 1'
    expect(detectPin(before, after, 'black')).toEqual({
      kind: 'pin',
      pinnedPiece: 'n',
      pinnedSquare: 'e6',
      pinnerPiece: 'b',
      pinnerSquare: 'c4',
    })
  })

  it('still flags a pin even when the pinned piece is defended', () => {
    // The pawn on d7 defends e6 — not "hanging" by the hanging-piece
    // detector's definition — but the knight is pinned regardless.
    const before = '5nk1/3p4/8/8/2B5/8/8/K7 b - - 0 1'
    const after = '6k1/3p4/4n3/8/2B5/8/8/K7 w - - 0 1'
    expect(detectPin(before, after, 'black')).toMatchObject({ pinnedSquare: 'e6' })
  })

  it('ignores a pin that already existed before the move', () => {
    // The knight on e6 is pinned throughout; only an unrelated pawn push
    // (h7-h6) happens on this ply.
    const before = '6k1/7p/4n3/8/2B5/8/8/K7 b - - 0 1'
    const after = '6k1/8/4n2p/8/2B5/8/8/K7 w - - 0 1'
    expect(detectPin(before, after, 'black')).toBeNull()
  })

  it('does not flag a pin when a second piece blocks the line', () => {
    // A pawn on f7 sits between the king and the knight on e6 — with two
    // blockers on the ray, neither piece is actually pinned.
    const fen = '6k1/5p2/4n3/8/2B5/8/8/K7 w - - 0 1'
    expect(detectPin(fen, fen, 'black')).toBeNull()
  })
})

describe('describePinReason', () => {
  it('formats a plain-English pin message', () => {
    expect(
      describePinReason({
        kind: 'pin',
        pinnedPiece: 'n',
        pinnedSquare: 'e6',
        pinnerPiece: 'b',
        pinnerSquare: 'c4',
      }),
    ).toBe(
      "This pins the knight on e6 to the king — it can't move without exposing the king to the bishop on c4.",
    )
  })
})

describe('describePinReason (Spanish)', () => {
  it('formats a plain-Spanish pin message', () => {
    expect(
      describePinReason(
        {
          kind: 'pin',
          pinnedPiece: 'n',
          pinnedSquare: 'e6',
          pinnerPiece: 'b',
          pinnerSquare: 'c4',
        },
        'es',
      ),
    ).toBe(
      'Esto clava el caballo en e6 al rey — no puede moverse sin exponer el rey al alfil en c4.',
    )
  })

  it('uses the "a la" preposition form for a feminine pinner', () => {
    expect(
      describePinReason(
        {
          kind: 'pin',
          pinnedPiece: 'n',
          pinnedSquare: 'e6',
          pinnerPiece: 'r',
          pinnerSquare: 'e1',
        },
        'es',
      ),
    ).toBe(
      'Esto clava el caballo en e6 al rey — no puede moverse sin exponer el rey a la torre en e1.',
    )
  })
})

describe('detectSkewer', () => {
  it('flags a sliding piece newly attacking two enemy pieces in a line, front then back', () => {
    // Black's Rg8 lands behind the queen on the c4-g8 diagonal: a skewer, not
    // a hanging piece, since the rook blocks the ray beyond the queen.
    const before = 'r7/7k/8/3q4/2B4K/8/8/8 b - - 0 1'
    const after = '6r1/7k/8/3q4/2B4K/8/8/8 w - - 1 2'
    expect(detectSkewer(before, after, 'black')).toEqual({
      kind: 'skewer',
      attackerPiece: 'b',
      attackerSquare: 'c4',
      frontPiece: 'q',
      frontSquare: 'd5',
      backPiece: 'r',
      backSquare: 'g8',
    })
  })

  it('ignores a skewer that already existed before the move', () => {
    // The bishop already skewers the queen and rook throughout; only an
    // unrelated king move (h7-h6) happens on this ply.
    const before = '6r1/7k/8/3q4/2B4K/8/8/8 b - - 0 1'
    const after = '6r1/8/7k/3q4/2B4K/8/8/8 w - - 1 2'
    expect(detectSkewer(before, after, 'black')).toBeNull()
  })

  it('does not flag a skewer when a second piece blocks the line', () => {
    // A white pawn on f7 sits between the queen on d5 and the rook on g8 —
    // with a blocker on the ray, the rook is never reached.
    const fen = '6r1/5P2/7k/3q4/2B4K/8/8/8 w - - 0 1'
    expect(detectSkewer(fen, fen, 'black')).toBeNull()
  })

  it('does not flag a skewer where the back piece is the king (that is a pin instead)', () => {
    // A king can't be the back piece of a skewer; that's a pin.
    const before = '5nk1/8/8/8/2B5/8/8/K7 b - - 0 1'
    const after = '6k1/8/4n3/8/2B5/8/8/K7 w - - 0 1'
    expect(detectSkewer(before, after, 'black')).toBeNull()
  })
})

describe('describeSkewerReason', () => {
  it('formats a plain-English skewer message', () => {
    expect(
      describeSkewerReason({
        kind: 'skewer',
        attackerPiece: 'b',
        attackerSquare: 'c4',
        frontPiece: 'q',
        frontSquare: 'd5',
        backPiece: 'r',
        backSquare: 'g8',
      }),
    ).toBe('This skewers the queen on d5 — if it moves, the bishop on c4 captures the rook on g8.')
  })
})

describe('describeSkewerReason (Spanish)', () => {
  it('formats a plain-Spanish skewer message', () => {
    expect(
      describeSkewerReason(
        {
          kind: 'skewer',
          attackerPiece: 'b',
          attackerSquare: 'c4',
          frontPiece: 'q',
          frontSquare: 'd5',
          backPiece: 'r',
          backSquare: 'g8',
        },
        'es',
      ),
    ).toBe('Esto enfila la dama en d5 — si se mueve, el alfil en c4 captura la torre en g8.')
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

  it('falls back to a skewer reason when no piece is hanging or forked', () => {
    // detectSkewer's fixture: not hanging, not a fork.
    const before = 'r7/7k/8/3q4/2B4K/8/8/8 b - - 0 1'
    const after = '6r1/7k/8/3q4/2B4K/8/8/8 w - - 1 2'
    expect(detectBlunderReason(before, after, 'black')).toMatchObject({ kind: 'skewer' })
  })

  it('falls back to a pin reason when no piece is hanging or forked', () => {
    // detectPin's fixture: defended, single target.
    const before = '5nk1/3p4/8/8/2B5/8/8/K7 b - - 0 1'
    const after = '6k1/3p4/4n3/8/2B5/8/8/K7 w - - 0 1'
    expect(detectBlunderReason(before, after, 'black')).toMatchObject({ kind: 'pin' })
  })

  it('returns null when no pattern applies', () => {
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

  it('dispatches to the skewer description', () => {
    expect(
      describeBlunderReason({
        kind: 'skewer',
        attackerPiece: 'b',
        attackerSquare: 'c4',
        frontPiece: 'q',
        frontSquare: 'd5',
        backPiece: 'r',
        backSquare: 'g8',
      }),
    ).toBe('This skewers the queen on d5 — if it moves, the bishop on c4 captures the rook on g8.')
  })

  it('dispatches to the pin description', () => {
    expect(
      describeBlunderReason({
        kind: 'pin',
        pinnedPiece: 'n',
        pinnedSquare: 'e6',
        pinnerPiece: 'b',
        pinnerSquare: 'c4',
      }),
    ).toBe(
      "This pins the knight on e6 to the king — it can't move without exposing the king to the bishop on c4.",
    )
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
    // White's Nd5 forks the queen (c7) and rook (b4); the d6 bishop defends
    // both so neither is hanging. Qc8 leaves the fork.
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
    // Nb5 newly forks the queen (c7) and rook (a7), which defend each other
    // so neither is hanging.
    const fen = '6k1/r1q5/8/8/3N4/8/8/6K1 w - - 0 1'
    const explanation = explainBestMove(fen, 'Nb5', 'white')
    expect(explanation).toMatch(/^Forks .+ at once\.$/)
    expect(explanation).toContain('the queen on c7')
    expect(explanation).toContain('the rook on a7')
  })

  it('explains that the suggested move escapes an existing skewer', () => {
    // The c4 bishop skewers the queen (d5) and rook (g8); the c6 pawn defends
    // the queen. Qa5 leaves the diagonal.
    const fen = '6r1/7k/2p5/3q4/2B4K/8/8/8 b - - 0 1'
    expect(explainBestMove(fen, 'Qa5', 'black')).toBe('Gets the queen on d5 out of the skewer.')
  })

  it('explains that the suggested move creates a new skewer on the opponent', () => {
    // Bc4 newly skewers the queen (d5) and rook (g8); the c6 pawn defends the
    // queen so it isn't hanging.
    const fen = '6r1/7k/2p5/3q4/7K/8/8/5B2 w - - 0 1'
    expect(explainBestMove(fen, 'Bc4', 'white')).toBe(
      "Skewers the opponent's queen on d5, with the rook behind it on g8.",
    )
  })

  it('explains that the suggested move frees a piece from a pin', () => {
    // The knight on e6 is pinned to the king on g8 by the bishop on c4;
    // Kh8 steps the king off the diagonal, freeing it.
    const fen = '6k1/3p4/4n3/8/2B5/8/8/K7 b - - 0 1'
    expect(explainBestMove(fen, 'Kh8', 'black')).toBe('Frees the knight on e6 from the pin.')
  })

  it('explains that the suggested move pins an opponent piece to their king', () => {
    // Bd3-c4 newly pins the defended knight on e6 to the king on g8.
    const fen = '6k1/3p4/4n3/8/8/3B4/8/K7 w - - 0 1'
    expect(explainBestMove(fen, 'Bc4', 'white')).toBe(
      "Pins the opponent's knight on e6 to their king.",
    )
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

  it('describes the mechanical part in Spanish when the locale is es', () => {
    const before = '7k/8/8/8/8/8/8/R6K w - - 0 1'
    expect(
      describeBetterMove(
        before,
        'Kg2',
        { from: 'a1', to: 'a5', san: 'Ra5', bestLine: [] },
        'white',
        'es',
      ),
    ).toBe('Ra5 (Torre a a5)')
  })

  it('omits the plan clause for a game_analysis row saved before bestLine existed', () => {
    // Old analyses have no `bestLine` key at all; this once crashed callers.
    const before = '7k/8/8/8/8/8/8/R6K w - - 0 1'
    const oldBestMove = { from: 'a1', to: 'a5', san: 'Ra5' } as BestMove
    expect(describeBetterMove(before, 'Kg2', oldBestMove, 'white')).toBe('Ra5 (Rook to a5)')
  })
})
