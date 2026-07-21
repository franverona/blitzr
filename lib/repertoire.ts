import type { MyColor, RepertoireDiffResult, RepertoireNode } from './types'

/** Groups nodes by parent, so children of a given node (or the roots, keyed
 *  by null) can be looked up in O(1) while walking a path down the tree. */
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
 * Walks a game's moves against the user's repertoire tree for the color
 * they played, ply by ply, following whichever child matches the move
 * actually played. Stops at the first ply with no matching child.
 *
 * That stopping point only counts as a "deviation" if it was the user's own
 * ply and they had prepared move(s) there — an opponent playing something
 * unprepared, or the user's prep simply running out, isn't the user leaving
 * their own repertoire.
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
