'use client'

import { useBoardContext } from './Board'
import type { OpeningLessonMove } from '@/lib/types'

/** Shows the plain-English note for whichever move led to the position
 *  currently on the board — reads `ply` from the same context BoardView
 *  consumes, so it stays in sync with Start/Prev/Next/End and the move list
 *  without any state of its own. */
export function MoveExplanation({ moves }: { moves: OpeningLessonMove[] }) {
  const { ply } = useBoardContext()
  const move = ply > 0 ? moves[ply - 1] : null

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-300">
      {move ? (
        <>
          <span className="font-medium text-zinc-900 dark:text-white">{move.san}</span> —{' '}
          {move.explanation}
        </>
      ) : (
        'Starting position.'
      )}
    </p>
  )
}
