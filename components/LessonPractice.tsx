'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { resolveOrientation } from '@/lib/theme'
import type { Lesson, LessonGameStats as LessonGameStatsData } from '@/lib/types'
import { AboutOpeningButton } from './AboutOpeningButton'
import { BoardNavControls, BoardProvider, BoardView } from './Board'
import { FlipBoardButton } from './FlipBoardButton'
import { LessonQuiz } from './LessonQuiz'
import { MoveExplanation } from './MoveExplanation'
import { useSettings } from './SettingsProvider'

type Mode = 'study' | 'quiz'

/** Study/Quiz toggle. `key={mode}` resets the board on every switch. */
export function LessonPractice({
  lesson,
  gameStats,
}: {
  lesson: Lesson
  /** null for endgame lessons, which hides the section. */
  gameStats: LessonGameStatsData | null
}) {
  const [mode, setMode] = useState<Mode>('study')
  const s = getStrings()
  const locale = getLocale()
  const movesSan = lesson.moves.map((move) => move.san)
  const { trainingOrientation } = useSettings()

  return (
    <BoardProvider
      key={mode}
      initialFen={lesson.initialFen}
      movesSan={movesSan}
      boardOrientation={resolveOrientation(trainingOrientation, lesson.primaryColor)}
      myColor={lesson.primaryColor}
      initialPly={mode === 'study' ? 1 : 0}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <h1 className="text-xl font-semibold">{lesson.name[locale]}</h1>
          <div className="flex items-center gap-2">
            <ModeTab
              label={s.lessonPractice.study}
              active={mode === 'study'}
              onClick={() => setMode('study')}
            />
            <ModeTab
              label={s.lessonPractice.quiz}
              active={mode === 'quiz'}
              onClick={() => setMode('quiz')}
            />
            <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            <FlipBoardButton />
            <AboutOpeningButton
              name={lesson.name[locale]}
              summary={lesson.summary[locale]}
              sourceUrl={lesson.sourceUrl}
            />
          </div>
        </div>
        {gameStats && <LessonGameStats stats={gameStats} />}
        {mode === 'study' ? (
          <BoardView
            // lg+: 13rem ≈ chrome above/below the board.
            boardMaxWidthClassName="max-w-172 lg:max-w-[min(43rem,calc(100dvh-13rem))]"
            sidebarExtra={
              // Splits the column's height with the move list.
              <div className="flex min-h-0 flex-col gap-4 lg:flex-1">
                <BoardNavControls />
                <MoveExplanation moves={lesson.moves} />
              </div>
            }
          />
        ) : (
          <LessonQuiz sidebarExtra={<MoveExplanation moves={lesson.moves} />} />
        )}
      </div>
    </BoardProvider>
  )
}

function LessonGameStats({ stats }: { stats: LessonGameStatsData }) {
  const s = getStrings()
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      {stats.games > 0
        ? s.lessonPractice.playedGames(stats.games, stats.wins, stats.draws, stats.losses)
        : s.lessonPractice.neverPlayed}
      {' — '}
      <Link href="/openings" className="text-blue-600 hover:underline dark:text-blue-400">
        {s.lessonPractice.seeOpeningStats}
      </Link>
      .
    </p>
  )
}

function ModeTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1 text-sm ${
        active
          ? 'border-accent bg-accent/20 text-zinc-900 dark:text-white'
          : 'border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  )
}
