import type { MyColor, RepertoireDiffResult, RepertoireNode } from './types'

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
