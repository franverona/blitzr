import { describe, expect, it } from 'vitest'
import {
  buildPositionChecklist,
  describeChecklistFinding,
  findingKey,
  findingMarks,
} from '@/lib/checklist'
import type { ChecklistFinding } from '@/lib/types'

describe('buildPositionChecklist', () => {
  it('finds a hanging piece', () => {
    // White knight on f3 is attacked by the bishop on b7 and has no
    // defender — same fixture used by detectHangingPiece's own tests.
    const fen = 'k7/1b6/8/8/8/5N2/8/4K3 w - - 0 1'
    const findings = buildPositionChecklist(fen)
    expect(findings).toContainEqual({
      side: 'white',
      reason: { kind: 'hanging-piece', piece: 'n', square: 'f3' },
    })
  })

  it('finds a fork', () => {
    // White knight on b5 forks the queen on c7 and the rook on a7 —
    // targets are black's, so the finding belongs to 'black'.
    const fen = '6k1/r1q5/8/1N6/8/8/8/6K1 w - - 0 1'
    const findings = buildPositionChecklist(fen)
    const fork = findings.find((f) => f.reason.kind === 'fork')
    expect(fork?.side).toBe('black')
    expect(fork?.reason).toMatchObject({ attackerPiece: 'n', attackerSquare: 'b5' })
    if (fork?.reason.kind === 'fork') {
      expect(fork.reason.targets.sort((a, b) => a.square.localeCompare(b.square))).toEqual([
        { piece: 'r', square: 'a7' },
        { piece: 'q', square: 'c7' },
      ])
    }
  })

  it('finds a pin', () => {
    // Knight on e6 is pinned to the black king on g8 by the bishop on c4.
    const fen = '6k1/8/4n3/8/2B5/8/8/K7 w - - 0 1'
    const findings = buildPositionChecklist(fen)
    expect(findings).toContainEqual({
      side: 'black',
      reason: {
        kind: 'pin',
        pinnedPiece: 'n',
        pinnedSquare: 'e6',
        pinnerPiece: 'b',
        pinnerSquare: 'c4',
      },
    })
  })

  it('finds a skewer', () => {
    // Bishop on c4 skewers the queen on d5 (front) then the rook on g8
    // (back) — both belong to black.
    const fen = '6r1/7k/8/3q4/2B4K/8/8/8 w - - 0 1'
    const findings = buildPositionChecklist(fen)
    expect(findings).toContainEqual({
      side: 'black',
      reason: {
        kind: 'skewer',
        attackerPiece: 'b',
        attackerSquare: 'c4',
        frontPiece: 'q',
        frontSquare: 'd5',
        backPiece: 'r',
        backSquare: 'g8',
      },
    })
  })

  it('finds findings for both sides at once', () => {
    // White's knight on f3 is hanging to black's bishop on b7; black's
    // rook on h8 is hanging to white's rook on h1 — unrelated squares, one
    // finding per side.
    const fen = 'k6r/1b6/8/8/8/5N2/8/4K2R w - - 0 1'
    const findings = buildPositionChecklist(fen)
    expect(findings).toContainEqual({
      side: 'white',
      reason: { kind: 'hanging-piece', piece: 'n', square: 'f3' },
    })
    expect(findings).toContainEqual({
      side: 'black',
      reason: { kind: 'hanging-piece', piece: 'r', square: 'h8' },
    })
  })

  it('returns an empty array for a quiet position', () => {
    const fen = 'k7/8/8/8/8/8/8/4K3 w - - 0 1'
    expect(buildPositionChecklist(fen)).toEqual([])
  })

  it('suppresses a hanging-piece finding for a square already covered by a fork', () => {
    // The knight on d4 forks the rook on b5 and the bishop on c2 — both are
    // independently undefended too, so without the dedup they'd each also
    // show up as a separate hanging-piece finding on top of the fork.
    const fen = 'k7/8/8/1r6/3N4/8/2b5/7K w - - 0 1'
    const findings = buildPositionChecklist(fen).filter((f) => f.side === 'black')
    expect(findings).toHaveLength(1)
    expect(findings[0].reason.kind).toBe('fork')
  })

  it('caps findings per side to the most valuable, dropping the rest', () => {
    // Black has four independently hanging pieces (queen 9, rook 5, bishop
    // 3, pawn 1) on unrelated squares/files — only the three most valuable
    // should survive the cap.
    const fen = 'q7/2k5/7r/8/8/3b4/5p2/R1KR1R1R w - - 0 1'
    const findings = buildPositionChecklist(fen).filter((f) => f.side === 'black')
    expect(findings).toHaveLength(3)
    expect(
      findings.map((f) => (f.reason.kind === 'hanging-piece' ? f.reason.square : null)),
    ).toEqual(['a8', 'h6', 'd3'])
  })
})

describe('describeChecklistFinding', () => {
  const hangingPiece: ChecklistFinding = {
    side: 'white',
    reason: { kind: 'hanging-piece', piece: 'n', square: 'b5' },
  }
  const fork: ChecklistFinding = {
    side: 'black',
    reason: {
      kind: 'fork',
      attackerPiece: 'n',
      attackerSquare: 'b5',
      targets: [
        { piece: 'q', square: 'c7' },
        { piece: 'r', square: 'a7' },
      ],
    },
  }
  const pin: ChecklistFinding = {
    side: 'black',
    reason: {
      kind: 'pin',
      pinnedPiece: 'n',
      pinnedSquare: 'e6',
      pinnerPiece: 'b',
      pinnerSquare: 'c4',
    },
  }
  const skewer: ChecklistFinding = {
    side: 'black',
    reason: {
      kind: 'skewer',
      attackerPiece: 'b',
      attackerSquare: 'c4',
      frontPiece: 'q',
      frontSquare: 'd5',
      backPiece: 'r',
      backSquare: 'g8',
    },
  }

  it('formats a hanging-piece finding', () => {
    expect(describeChecklistFinding(hangingPiece)).toBe(
      'The knight on b5 is hanging — it can be captured for free.',
    )
  })

  it('formats a fork finding', () => {
    expect(describeChecklistFinding(fork)).toBe(
      'The knight on b5 attacks the queen on c7 and the rook on a7 at once.',
    )
  })

  it('formats a pin finding', () => {
    expect(describeChecklistFinding(pin)).toBe(
      'The bishop on c4 pins the knight on e6 to the king.',
    )
  })

  it('formats a skewer finding', () => {
    expect(describeChecklistFinding(skewer)).toBe(
      'The bishop on c4 skewers the queen on d5, with the rook behind it on g8.',
    )
  })

  it('formats a hanging-piece finding in Spanish', () => {
    expect(describeChecklistFinding(hangingPiece, 'es')).toBe(
      'El caballo en b5 está colgando — se puede capturar gratis.',
    )
  })

  it('formats a fork finding in Spanish', () => {
    expect(describeChecklistFinding(fork, 'es')).toBe(
      'El caballo en b5 ataca la dama en c7 y la torre en a7 a la vez.',
    )
  })

  it('formats a pin finding in Spanish', () => {
    expect(describeChecklistFinding(pin, 'es')).toBe(
      'El alfil en c4 clava el caballo en e6 al rey.',
    )
  })

  it('formats a skewer finding in Spanish', () => {
    expect(describeChecklistFinding(skewer, 'es')).toBe(
      'El alfil en c4 enfila la dama en d5, con la torre detrás en g8.',
    )
  })

  it('gives distinct, stable keys per finding', () => {
    expect(findingKey(hangingPiece)).toBe('white-hanging-b5')
    expect(findingKey(fork)).toBe('black-fork-b5')
    expect(findingKey(pin)).toBe('black-pin-e6')
    expect(findingKey(skewer)).toBe('black-skewer-c4-g8')
    const keys = [hangingPiece, fork, pin, skewer].map(findingKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('marks a hanging-piece finding with a highlight only, no arrow', () => {
    expect(findingMarks(hangingPiece.reason)).toEqual({ squares: ['b5'], arrows: [] })
  })

  it('marks a fork finding with one arrow per target', () => {
    expect(findingMarks(fork.reason)).toEqual({
      squares: ['b5', 'c7', 'a7'],
      arrows: [
        ['b5', 'c7'],
        ['b5', 'a7'],
      ],
    })
  })

  it('marks a pin finding with an arrow from pinner to pinned', () => {
    expect(findingMarks(pin.reason)).toEqual({
      squares: ['c4', 'e6'],
      arrows: [['c4', 'e6']],
    })
  })

  it('marks a skewer finding with an arrow from attacker to the back piece', () => {
    expect(findingMarks(skewer.reason)).toEqual({
      squares: ['c4', 'd5', 'g8'],
      arrows: [['c4', 'g8']],
    })
  })
})
