'use client'

import { getStrings } from '@/lib/i18n/strings'
import type { Lesson } from '@/lib/types'
import { PlayoutBoard } from './PlayoutBoard'

// Enough to defend K+Q/K+R vs K well; the engine never has a real choice to make.
const ENGINE_MOVETIME_MS = 300

/**
 * An endgame lesson's position played out against Stockfish: the user has the lesson's side, the
 * engine defends. Won at mate, or at promotion for a lesson whose line ends in one.
 */
export function EndgamePlayout({ lesson }: { lesson: Lesson }) {
  const s = getStrings()
  const goalIsPromotion = lesson.moves.at(-1)?.san.includes('=') ?? false
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      <PlayoutBoard
        initialFen={lesson.initialFen}
        myColor={lesson.primaryColor}
        movetimeMs={ENGINE_MOVETIME_MS}
        goalIsPromotion={goalIsPromotion}
        messages={{
          thinking: s.endgamePlayout.engineThinking,
          won: s.endgamePlayout.won,
          drawn: s.endgamePlayout.drawn,
          lost: s.endgamePlayout.lost,
        }}
        // lg+: 17rem ≈ chrome above/below the board, as in LessonQuiz.
        boardMaxWidthClassName="max-w-140 lg:max-w-[min(35rem,calc(100dvh-17rem))]"
        footer={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {goalIsPromotion ? s.endgamePlayout.goalPromotion : s.endgamePlayout.goalMate}
          </p>
        }
      />
    </div>
  )
}
