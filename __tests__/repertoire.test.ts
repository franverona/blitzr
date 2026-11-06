import { describe, expect, it } from 'vitest'
import {
  diffGameAgainstRepertoire,
  findRepertoireGaps,
  lineGameCounts,
  lineToRepertoireNodes,
  repertoireLines,
  weightedLineIndex,
} from '@/lib/repertoire'
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

describe('lineToRepertoireNodes', () => {
  let n = 0
  const newId = () => `new-${++n}`

  it('builds the whole line on an empty tree, chaining parents', () => {
    n = 0
    const nodes = lineToRepertoireNodes(['e4', 'e5', 'Nf3'], 'white', [], newId, 't')!
    expect(nodes.map((x) => [x.id, x.parentId, x.ply, x.moveSan])).toEqual([
      ['new-1', null, 1, 'e4'],
      ['new-2', 'new-1', 2, 'e5'],
      ['new-3', 'new-2', 3, 'Nf3'],
    ])
    expect(nodes[2].fen).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2')
  })

  it('reuses the nodes the tree already has and branches after them', () => {
    n = 0
    const tree = lineToRepertoireNodes(['e4', 'e5', 'Nc3'], 'white', [], newId, 't')!
    const added = lineToRepertoireNodes(['e4', 'e5', 'Nf3'], 'white', tree, newId, 't')!
    expect(added.map((x) => [x.moveSan, x.parentId])).toEqual([['Nf3', tree[1].id]])
    expect(
      lineToRepertoireNodes(['e4', 'e5', 'Nf3'], 'white', [...tree, ...added], newId, 't'),
    ).toEqual([])
  })

  it("ignores the other color's tree, and rejects an illegal line", () => {
    n = 0
    const black = lineToRepertoireNodes(['e4'], 'black', [], newId, 't')!
    expect(lineToRepertoireNodes(['e4'], 'white', black, newId, 't')).toHaveLength(1)
    expect(lineToRepertoireNodes(['e4', 'e4'], 'white', [], newId, 't')).toBeNull()
  })
})

describe('repertoireLines', () => {
  it('lists every root-to-leaf line', () => {
    const nodes = [
      node({ id: 'e4', ply: 1, moveSan: 'e4' }),
      node({ id: 'e5', parentId: 'e4', ply: 2, moveSan: 'e5' }),
      node({ id: 'c5', parentId: 'e4', ply: 2, moveSan: 'c5' }),
      node({ id: 'nf3', parentId: 'e5', ply: 3, moveSan: 'Nf3' }),
    ]
    expect(repertoireLines(nodes, 'white')).toEqual([
      ['e4', 'e5', 'Nf3'],
      ['e4', 'c5'],
    ])
  })

  it("drops a Black line with no Black move, and an empty tree's", () => {
    const nodes = [
      node({ id: 'e4', color: 'black', ply: 1, moveSan: 'e4' }),
      node({ id: 'd4', color: 'black', ply: 1, moveSan: 'd4' }),
      node({ id: 'd5', color: 'black', parentId: 'd4', ply: 2, moveSan: 'd5' }),
    ]
    expect(repertoireLines(nodes, 'black')).toEqual([['d4', 'd5']])
    expect(repertoireLines([], 'white')).toEqual([])
  })
})

describe('lineGameCounts', () => {
  const lines = [
    ['e4', 'e5', 'Nf3'],
    ['e4', 'c5', 'Nf3'],
    ['d4', 'd5'],
  ]
  const game = (moves: string[], myColor: 'white' | 'black' = 'white') =>
    ({ movesSan: moves, myColor }) as Game

  it('credits each game to the line it shares the longest prefix with, ties to all', () => {
    const games = [
      game(['e4', 'c5', 'Nc3']),
      game(['e4', 'c5', 'Nf3', 'd6']),
      game(['e4', 'e6']),
      game(['c4', 'e5']),
      game(['d4', 'd5'], 'black'),
    ]
    expect(lineGameCounts(lines, games, 'white')).toEqual([1, 3, 0])
  })
})

describe('weightedLineIndex', () => {
  it('draws by count + 1 and never the current line', () => {
    // Weights [1, 4, 0 (current)]: r in [0, 1) is line 0, [1, 5) line 1.
    expect(weightedLineIndex([0, 3, 9], 2, () => 0.1)).toBe(0)
    expect(weightedLineIndex([0, 3, 9], 2, () => 0.5)).toBe(1)
    expect(weightedLineIndex([0, 3, 9], 2, () => 0.999)).toBe(1)
    expect(weightedLineIndex([5], 0)).toBe(0)
  })
})
