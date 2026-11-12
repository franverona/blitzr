'use client'

import { useState } from 'react'
import { botMovetimeMs, botUciOptions, type BotElo } from '@/lib/botStrength'
import { getStrings } from '@/lib/i18n/strings'
import type { Lesson } from '@/lib/types'
import { BotStrengthSelect } from './BotStrengthSelect'
import { PlayoutBoard, type PlayoutGoal } from './PlayoutBoard'

// Enough to defend K+Q/K+R vs K well; the engine never has a real choice to make.
const FULL_STRENGTH_MOVETIME_MS = 300

/**
 * A lesson's position played out against Stockfish at a chosen strength: the user has the lesson's
 * side. Won per the lesson's goal: mate, promotion (a line ending in one), or `playGoal`.
 */
export function EndgamePlayout({ lesson }: { lesson: Lesson }) {
  const s = getStrings()
  const [elo, setElo] = useState<BotElo | null>(null)
  const goal: PlayoutGoal =
    lesson.playGoal ?? (lesson.moves.at(-1)?.san.includes('=') ? 'promotion' : 'mate')
  return (
    <PlayoutBoard
      // The engine is configured once, so a new strength needs a fresh board.
      key={elo ?? 'full'}
      initialFen={lesson.initialFen}
      myColor={lesson.primaryColor}
      engineOptions={elo ? botUciOptions(elo) : []}
      movetimeMs={elo ? botMovetimeMs(elo) : FULL_STRENGTH_MOVETIME_MS}
      goal={goal}
      // Take back, for practice.
      allowResign
      messages={{
        thinking: goal === 'draw' ? s.playBot.thinking : s.endgamePlayout.engineThinking,
        won: goal === 'draw' ? s.endgamePlayout.held : s.endgamePlayout.won,
        drawn: s.endgamePlayout.drawn,
        lost: s.endgamePlayout.lost,
      }}
      sidebar={{
        top: (inProgress) => (
          <div className="flex flex-col gap-2">
            <BotStrengthSelect
              value={elo}
              onChange={setElo}
              locked={inProgress}
              fullStrengthOption
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {goal === 'draw'
                ? s.endgamePlayout.goalDraw
                : goal === 'promotion'
                  ? s.endgamePlayout.goalPromotion
                  : s.endgamePlayout.goalMate}
            </p>
          </div>
        ),
        className: 'lg:max-w-xs xl:max-w-sm',
      }}
      // lg+: 7rem ≈ the lesson header and the coordinates under the board.
      boardMaxWidthClassName="max-w-160 lg:max-w-[min(42rem,calc(100dvh-7rem))]"
    />
  )
}
