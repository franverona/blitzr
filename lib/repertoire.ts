import { Chess } from 'chess.js'
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

/**
 * The nodes a SAN line from the start position adds to a color's tree: it follows existing nodes
 * where they match, then branches. Empty if the line is already there; null if a move is illegal.
 */
export function lineToRepertoireNodes(
  movesSan: string[],
  color: RepertoireColor,
  existing: RepertoireNode[],
  newId: () => string,
  now: string,
): RepertoireNode[] | null {
  const chess = new Chess()
  const added: RepertoireNode[] = []
  let parentId: string | null = null
  for (const [i, san] of movesSan.entries()) {
    let move
    try {
      move = chess.move(san)
    } catch {
      return null
    }
    const match: RepertoireNode | undefined = existing.find(
      (n) => n.color === color && n.parentId === parentId && n.moveSan === move.san,
    )
    if (match) {
      parentId = match.id
      continue
    }
    const node: RepertoireNode = {
      id: newId(),
      color,
      parentId,
      ply: i + 1,
      moveSan: move.san,
      fen: chess.fen(),
      createdAt: now,
    }
    // Nothing in `existing` hangs below a new node, so later moves all branch too.
    added.push(node)
    parentId = node.id
  }
  return added
}

/** Every root-to-leaf line of a color's tree as SAN, keeping only lines with a move of that color. */
export function repertoireLines(nodes: RepertoireNode[], color: RepertoireColor): string[][] {
  const index = buildRepertoireIndex(nodes)
  const lines: string[][] = []
  const walk = (parentId: string | null, line: string[]) => {
    const children = index.get(parentId) ?? []
    if (children.length === 0 && line.length > 0) lines.push(line)
    for (const child of children) walk(child.id, [...line, child.moveSan])
  }
  walk(null, [])
  // White moves on odd plies from the start position; a Black line needs at least two moves.
  return lines.filter((line) => line.length >= (color === 'white' ? 1 : 2))
}
