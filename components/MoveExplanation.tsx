'use client'

import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import type { LessonMove } from '@/lib/types'
import { useBoardContext } from './BoardContext'

/** The note for the move that led to the current ply. */
export function MoveExplanation({ moves }: { moves: LessonMove[] }) {
  const { ply } = useBoardContext()
  const s = getStrings()
  const locale = getLocale()
  const move = ply > 0 ? moves[ply - 1] : null

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-300">
      {move ? (
        <>
          <span className="font-medium text-zinc-900 dark:text-white">{move.san}</span> —{' '}
          {move.explanation[locale]}
        </>
      ) : (
        s.moveExplanation.startingPosition
      )}
    </p>
  )
}
