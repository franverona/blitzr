import type {
  Game,
  MyColor,
  RepertoireColor,
  RepertoireDiffResult,
  RepertoireGap,
  RepertoireNode,
} from './types'

/** Children by parent id (roots under null). */
export function buildRepertoireIndex(
  nodes: RepertoireNode[],
): Map<string | null, RepertoireNode[]> {
  const index = new Map<string | null, RepertoireNode[]>()
  for (const node of nodes) {
    const siblings = index.get(node.parentId) ?? []
    siblings.push(node)
    index.set(node.parentId, siblings)
  }
  return index
}

/**
 * Follows the game's moves down the repertoire tree until no child matches.
 * That's a deviation only on the user's own ply with prepared moves there.
 */
export function diffGameAgainstRepertoire(
  movesSan: string[],
  myColor: MyColor,
  nodes: RepertoireNode[],
): RepertoireDiffResult {
  const index = buildRepertoireIndex(nodes)
  let children = index.get(null) ?? []
  let inBookPlies = 0

  for (let i = 0; i < movesSan.length; i++) {
    const ply = i + 1
    const actualMove = movesSan[i]
    const match = children.find((node) => node.moveSan === actualMove)

    if (!match) {
      const whiteToMove = ply % 2 === 1
      const isMyPly = whiteToMove === (myColor === 'white')
      if (isMyPly && children.length > 0) {
        return {
          inBookPlies,
          deviationPly: ply,
          deviationMove: actualMove,
          expectedMoves: children.map((node) => node.moveSan),
        }
      }
      return { inBookPlies, deviationPly: null, deviationMove: null, expectedMoves: null }
    }

    inBookPlies = ply
    children = index.get(match.id) ?? []
  }

  return { inBookPlies, deviationPly: null, deviationMove: null, expectedMoves: null }
}

/**
 * Where `color`'s games most often went past the end of the tree without a deviation: the tree
 * ran out, or the opponent played a move it has no answer for. Grouped by the line in book plus
 * the move played next, most games first. Exact move order, like the diff.
 */
export function findRepertoireGaps(
  games: Game[],
  color: RepertoireColor,
  nodes: RepertoireNode[],
  limit = 5,
): RepertoireGap[] {
  if (nodes.length === 0) return []
  const gaps = new Map<string, RepertoireGap>()
  for (const game of games) {
    if (game.myColor !== color || !game.movesSan) continue
    const diff = diffGameAgainstRepertoire(game.movesSan, color, nodes)
    if (diff.deviationPly !== null || diff.inBookPlies >= game.movesSan.length) continue
    const line = game.movesSan.slice(0, diff.inBookPlies)
    const next = game.movesSan[diff.inBookPlies]
    const key = [...line, next].join(' ')
    const gap = gaps.get(key) ?? { line, next, games: 0 }
    gap.games++
    gaps.set(key, gap)
  }
  return [...gaps.values()].sort((a, b) => b.games - a.games).slice(0, limit)
}
