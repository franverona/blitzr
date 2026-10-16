'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import type { Lesson, LessonGameStats as LessonGameStatsData } from '@/lib/types'
import { AboutOpeningButton } from './AboutOpeningButton'
import { BoardNavControls, BoardProvider, BoardView } from './Board'
import { FlipBoardButton } from './FlipBoardButton'
import { LessonQuiz } from './LessonQuiz'
import { MoveExplanation } from './MoveExplanation'

type Mode = 'study' | 'quiz'

/** Owns the Study/Quiz toggle for a lesson page. `key={mode}` on
 *  BoardProvider remounts it on every switch — each mode wants a different
 *  starting ply (study opens on the first move already played; quiz starts
 *  from the empty board) and switching should always reset progress rather
 *  than carry over wherever the other mode's board happened to land. */
export function LessonPractice({
  lesson,
  gameStats,
}: {
  lesson: Lesson
  /** How many of the account's own synced games reached this lesson's exact
   *  line, computed server-side in `app/learn/[slug]/page.tsx` — only
   *  meaningful for an opening lesson (a game doesn't "reach" an endgame
   *  position via a move prefix from move 1), so `null` for an endgame
   *  lesson skips the section entirely rather than showing a nonsense
   *  "0 games" line. */
  gameStats: LessonGameStatsData | null
}) {
  const [mode, setMode] = useState<Mode>('study')
  const s = getStrings()
  const locale = getLocale()
  const movesSan = lesson.moves.map((move) => move.san)

  return (
    <BoardProvider
      key={mode}
      initialFen={lesson.initialFen}
      movesSan={movesSan}
      boardOrientation={lesson.primaryColor}
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
            // Side-by-side (lg+), capped by viewport height like the game page
            // so header + board + coordinates fit a 13" laptop screen without
            // a page scroll; 13rem ≈ everything above/below the board here.
            boardMaxWidthClassName="max-w-172 lg:max-w-[min(43rem,calc(100dvh-13rem))]"
            sidebarExtra={
              // `lg:flex-1` splits the column's height evenly with the move
              // list (also `flex-1`) rather than letting it take everything —
              // a lesson is never more than ~10 moves, so half is plenty, and
              // it keeps the nav controls and explanation near the top.
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
