'use client'

import { getStrings } from '@/lib/i18n/strings'
import type { OpeningLessonMove } from '@/lib/types'
import { useBoardContext } from './Board'

/** Shows the plain-English note for whichever move led to the position
 *  currently on the board — reads `ply` from the same context BoardView
 *  consumes, so it stays in sync with Start/Prev/Next/End and the move list
 *  without any state of its own. */
export function MoveExplanation({ moves }: { moves: OpeningLessonMove[] }) {
  const { ply } = useBoardContext()
  const s = getStrings()
  const move = ply > 0 ? moves[ply - 1] : null

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-300">
      {move ? (
        <>
          <span className="font-medium text-zinc-900 dark:text-white">{move.san}</span> —{' '}
          {move.explanation}
        </>
      ) : (
        s.moveExplanation.startingPosition
      )}
    </p>
  )
}
