import { describe, expect, it } from 'vitest'
import { parseGameSort, sortIdsByAccuracy } from '@/lib/gameSort'

describe('parseGameSort', () => {
  it('accepts allowed values', () => {
    expect(parseGameSort('accuracy', 'asc')).toEqual({ sort: 'accuracy', dir: 'asc' })
    expect(parseGameSort('errors', undefined)).toEqual({ sort: 'errors', dir: 'desc' })
  })

  it('falls back to newest first', () => {
    expect(parseGameSort('opponent', 'sideways')).toEqual({ sort: 'date', dir: 'desc' })
    expect(parseGameSort(undefined, undefined)).toEqual({ sort: 'date', dir: 'desc' })
  })
})

describe('sortIdsByAccuracy', () => {
  const acc = {
    a: { accuracy: 70, mistakes: 1, blunders: 2 },
    b: { accuracy: 90, mistakes: 3, blunders: 0 },
    c: { accuracy: 80, mistakes: 0, blunders: 2 },
    d: { accuracy: 80, mistakes: 5, blunders: 0 },
  }
  const ids = ['x', 'a', 'b', 'y', 'c', 'd']

  it('sorts by accuracy, unanalyzed last both ways, ties in input order', () => {
    expect(sortIdsByAccuracy(ids, acc, 'accuracy', 'desc')).toEqual(['b', 'c', 'd', 'a', 'x', 'y'])
    expect(sortIdsByAccuracy(ids, acc, 'accuracy', 'asc')).toEqual(['a', 'c', 'd', 'b', 'x', 'y'])
  })

  it('sorts by blunders, then mistakes', () => {
    expect(sortIdsByAccuracy(ids, acc, 'errors', 'desc')).toEqual(['a', 'c', 'd', 'b', 'x', 'y'])
    expect(sortIdsByAccuracy(ids, acc, 'errors', 'asc')).toEqual(['b', 'd', 'c', 'a', 'x', 'y'])
  })
})
