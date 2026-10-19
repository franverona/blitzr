import { Chess } from 'chess.js'

// ponytail: node budget caps the brute-force search (one busy mate-in-3 ran
// 50+ minutes unbounded) at the cost of false negatives on very branchy
// positions. 3000 was picked empirically; raise it or add alpha-beta pruning
// if a real puzzle gets rejected.
const FORCED_MATE_NODE_BUDGET = 3_000

/** Whether the side to move forces mate within `mateIn` moves against every
 *  legal reply. */
export function isForcedMate(fen: string, mateIn: number): boolean {
  return canForceMate(new Chess(fen), mateIn, { remaining: FORCED_MATE_NODE_BUDGET })
}

function canForceMate(chess: Chess, mateIn: number, budget: { remaining: number }): boolean {
  if (mateIn < 1) return false
  if (budget.remaining <= 0) return false
  budget.remaining -= 1

  for (const solverMove of chess.moves()) {
    chess.move(solverMove)

    if (mateIn === 1) {
      const solved = chess.isCheckmate()
      chess.undo()
      if (solved) return true
      continue
    }
    if (chess.isCheckmate()) {
      chess.undo() // mates too early; another branch may still be needed
      continue
    }

    const opponentReplies = chess.moves()
    if (opponentReplies.length === 0) {
      chess.undo() // stalemate — not a forced mate, fail this branch
      continue
    }

    const forced = opponentReplies.every((reply) => {
      chess.move(reply)
      const result = canForceMate(chess, mateIn - 1, budget)
      chess.undo()
      return result
    })
    chess.undo()
    if (forced) return true
    if (budget.remaining <= 0) return false
  }
  return false
}
