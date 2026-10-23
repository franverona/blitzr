import { describe, expect, it } from 'vitest'
import type { RepertoireNode } from '@/lib/types'
import {
  isValidAnalysis,
  isValidDrillAnswer,
  isValidDrillUndo,
  normalizeRepertoireNode,
} from '@/lib/validate'

const evalOk = { cp: 20, mate: null, bestMove: { from: 'e2', to: 'e4', san: 'e4', bestLine: [] } }

describe('isValidAnalysis', () => {
  it('needs one eval per position and a positive movetime', () => {
    expect(isValidAnalysis([evalOk, evalOk], 1, 300)).toBe(true)
    expect(isValidAnalysis([evalOk], 1, 300)).toBe(false)
    expect(isValidAnalysis([evalOk, evalOk], 1, 0)).toBe(false)
    expect(isValidAnalysis('[]', 0, 300)).toBe(false)
  })

  it('rejects malformed evals', () => {
    expect(isValidAnalysis([evalOk, { cp: '20', mate: null, bestMove: null }], 1, 300)).toBe(false)
    expect(isValidAnalysis([evalOk, { cp: 1, mate: null, bestMove: { san: 1 } }], 1, 300)).toBe(
      false,
    )
  })
})

function node(overrides: Partial<RepertoireNode>): RepertoireNode {
  return {
    id: 'n1',
    color: 'white',
    parentId: null,
    ply: 1,
    moveSan: 'e4',
    fen: 'bogus',
    createdAt: '',
    ...overrides,
  }
}

describe('normalizeRepertoireNode', () => {
  it('re-derives the FEN from a legal move', () => {
    const root = normalizeRepertoireNode(node({}), undefined)
    expect(root?.fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
    const reply = normalizeRepertoireNode(
      node({ id: 'n2', parentId: 'n1', ply: 2, moveSan: 'e5' }),
      root!,
    )
    expect(reply?.moveSan).toBe('e5')
  })

  it('rejects illegal moves, bad colors and mismatched plies or parents', () => {
    expect(normalizeRepertoireNode(node({ moveSan: 'e5' }), undefined)).toBeNull()
    expect(normalizeRepertoireNode(node({ color: 'red' as 'white' }), undefined)).toBeNull()
    expect(normalizeRepertoireNode(node({ ply: 3 }), undefined)).toBeNull()
    expect(normalizeRepertoireNode(node({ parentId: 'missing' }), undefined)).toBeNull()
    const root = normalizeRepertoireNode(node({}), undefined)!
    expect(
      normalizeRepertoireNode(node({ parentId: 'n1', ply: 2, color: 'black' }), root),
    ).toBeNull()
  })
})

describe('isValidDrillAnswer', () => {
  it('accepts a well-formed answer', () => {
    expect(isValidDrillAnswer('g1', 'blunder', 12, true)).toBe(true)
    expect(isValidDrillAnswer('g1', 'deviation', 1, false)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidDrillAnswer(1, 'blunder', 12, true)).toBe(false)
    expect(isValidDrillAnswer('g1', 'puzzle', 12, true)).toBe(false)
    expect(isValidDrillAnswer('g1', 'blunder', 0, true)).toBe(false)
    expect(isValidDrillAnswer('g1', 'blunder', 1.5, true)).toBe(false)
    expect(isValidDrillAnswer('g1', 'blunder', 12, 'yes')).toBe(false)
  })
})

describe('isValidDrillUndo', () => {
  const previous = {
    dueAt: '2026-10-20T00:00:00.000Z',
    intervalDays: 6,
    easeFactor: 2.6,
    repetitions: 2,
    lastReviewedAt: '2026-10-14T09:00:00.000Z',
  }
  const reviewedAt = '2026-10-23T09:00:00.000Z'

  it('accepts the schedule submitDrillAnswer() returned, including a never-reviewed card', () => {
    expect(isValidDrillUndo({ previous, reviewedAt })).toBe(true)
    expect(isValidDrillUndo({ previous: { ...previous, lastReviewedAt: null }, reviewedAt })).toBe(
      true,
    )
  })

  it('rejects malformed schedules', () => {
    expect(isValidDrillUndo(null)).toBe(false)
    expect(isValidDrillUndo({ previous, reviewedAt: 'soon' })).toBe(false)
    expect(isValidDrillUndo({ previous: { ...previous, dueAt: 'later' }, reviewedAt })).toBe(false)
    expect(isValidDrillUndo({ previous: { ...previous, intervalDays: -1 }, reviewedAt })).toBe(
      false,
    )
    expect(isValidDrillUndo({ previous: { ...previous, repetitions: 1.5 }, reviewedAt })).toBe(
      false,
    )
    expect(isValidDrillUndo({ previous: { ...previous, easeFactor: NaN }, reviewedAt })).toBe(false)
  })
})
