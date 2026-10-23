import { describe, expect, it } from 'vitest'
import { diffGameAgainstRepertoire, findRepertoireGaps } from '@/lib/repertoire'
import type { Game, RepertoireNode } from '@/lib/types'

function node(overrides: Partial<RepertoireNode>): RepertoireNode {
  return {
    id: Math.random().toString(36).slice(2),
    color: 'white',
    parentId: null,
    ply: 1,
    moveSan: 'e4',
    fen: '',
    createdAt: '',
    ...overrides,
  }
}

describe('diffGameAgainstRepertoire', () => {
  it('reports fully in book when every move matches the tree', () => {
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const e5 = node({ id: 'e5', parentId: 'e4', ply: 2, moveSan: 'e5' })
    const nf3 = node({ id: 'nf3', parentId: 'e5', ply: 3, moveSan: 'Nf3' })

    const result = diffGameAgainstRepertoire(['e4', 'e5', 'Nf3'], 'white', [e4, e5, nf3])
    expect(result).toEqual({
      inBookPlies: 3,
      deviationPly: null,
      deviationMove: null,
      expectedMoves: null,
    })
  })

  it('flags the ply where the user played outside their prepared moves', () => {
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const e5 = node({ id: 'e5', parentId: 'e4', ply: 2, moveSan: 'e5' })
    const nf3 = node({ id: 'nf3', parentId: 'e5', ply: 3, moveSan: 'Nf3' })
    const bc4 = node({ id: 'bc4', parentId: 'e5', ply: 3, moveSan: 'Bc4' })

    // Prepared Nf3 or Bc4 at move 3, but the game played Nc3 instead.
    const result = diffGameAgainstRepertoire(['e4', 'e5', 'Nc3'], 'white', [e4, e5, nf3, bc4])
    expect(result).toEqual({
      inBookPlies: 2,
      deviationPly: 3,
      deviationMove: 'Nc3',
      expectedMoves: ['Nf3', 'Bc4'],
    })
  })

  it('does not flag a deviation when the opponent leaves book', () => {
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
    const e5 = node({ id: 'e5', parentId: 'e4', ply: 2, moveSan: 'e5' })

    // Repertoire only prepared 1...e5; the opponent played 1...c5 instead.
    const result = diffGameAgainstRepertoire(['e4', 'c5', 'Nf3'], 'white', [e4, e5])
    expect(result).toEqual({
      inBookPlies: 1,
      deviationPly: null,
      deviationMove: null,
      expectedMoves: null,
    })
  })

  it('does not flag a deviation when the user simply has no prep left', () => {
    const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })

    // Nothing prepared beyond move 1 for black's reply.
    const result = diffGameAgainstRepertoire(['e4', 'e5', 'Nf3'], 'white', [e4])
    expect(result).toEqual({
      inBookPlies: 1,
      deviationPly: null,
      deviationMove: null,
      expectedMoves: null,
    })
  })

  it('works symmetrically for a black repertoire', () => {
    const e4 = node({ id: 'e4', color: 'black', ply: 1, moveSan: 'e4' })
    const c5 = node({ id: 'c5', color: 'black', parentId: 'e4', ply: 2, moveSan: 'c5' })

    const result = diffGameAgainstRepertoire(['e4', 'e5'], 'black', [e4, c5])
    expect(result).toEqual({
      inBookPlies: 1,
      deviationPly: 2,
      deviationMove: 'e5',
      expectedMoves: ['c5'],
    })
  })
})

describe('findRepertoireGaps', () => {
  const e4 = node({ id: 'e4', ply: 1, moveSan: 'e4' })
  const e5 = node({ id: 'e5', parentId: 'e4', ply: 2, moveSan: 'e5' })
  const nodes = [e4, e5]
  const game = (movesSan: string[], myColor: 'white' | 'black' = 'white') =>
    ({ id: movesSan.join(''), movesSan, myColor }) as Game

  it("groups games by where they ran past the tree, most first, skipping deviations and other colors' games", () => {
    const gaps = findRepertoireGaps(
      [
        game(['e4', 'e5', 'Nf3', 'Nc6']), // the tree ran out after 1...e5
        game(['e4', 'e5', 'Nf3']),
        game(['e4', 'c5', 'Nf3']), // the opponent played a move the tree doesn't answer
        game(['d4', 'd5']), // a deviation: e4 was prepared
        game(['e4', 'e5', 'Nf3'], 'black'),
        game(['e4', 'e5']), // ended in book
      ],
      'white',
      nodes,
    )
    expect(gaps).toEqual([
      { line: ['e4', 'e5'], next: 'Nf3', games: 2 },
      { line: ['e4'], next: 'c5', games: 1 },
    ])
  })

  it('needs a tree for the color', () => {
    expect(findRepertoireGaps([game(['e4', 'e5', 'Nf3'])], 'white', [])).toEqual([])
  })
})
