'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LessonGameStats as LessonGameStatsData, OpeningLesson } from '@/lib/types'
import { AboutOpeningButton } from './AboutOpeningButton'
import { BoardNavControls, BoardProvider, BoardView } from './Board'
import { FlipBoardButton } from './FlipBoardButton'
import { LessonQuiz } from './LessonQuiz'
import { MoveExplanation } from './MoveExplanation'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

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
  lesson: OpeningLesson
  /** How many of the account's own synced games reached this lesson's exact
   *  line, computed server-side in `app/learn/[slug]/page.tsx`. */
  gameStats: LessonGameStatsData
}) {
  const [mode, setMode] = useState<Mode>('study')
  const movesSan = lesson.moves.map((move) => move.san)

  return (
    <BoardProvider
      key={mode}
      initialFen={START_FEN}
      movesSan={movesSan}
      boardOrientation={lesson.primaryColor}
      initialPly={mode === 'study' ? 1 : 0}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{lesson.name}</h1>
          <div className="flex items-center gap-2">
            <ModeTab label="Study" active={mode === 'study'} onClick={() => setMode('study')} />
            <ModeTab label="Quiz" active={mode === 'quiz'} onClick={() => setMode('quiz')} />
            <span className="mx-1 h-4 w-px bg-zinc-700" />
            {mode === 'study' && <BoardNavControls />}
            <FlipBoardButton />
            <AboutOpeningButton
              name={lesson.name}
              summary={lesson.summary}
              sourceUrl={lesson.sourceUrl}
            />
          </div>
        </div>
        <LessonGameStats stats={gameStats} />
        <MoveExplanation moves={lesson.moves} />
        {mode === 'study' ? <BoardView boardMaxWidthClassName="max-w-172" /> : <LessonQuiz />}
      </div>
    </BoardProvider>
  )
}

function LessonGameStats({ stats }: { stats: LessonGameStatsData }) {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      {stats.games > 0 ? (
        <>
          You&rsquo;ve played this in {stats.games} of your games ({stats.wins}W {stats.draws}D{' '}
          {stats.losses}L)
        </>
      ) : (
        "You haven't played this exact line in any synced games yet"
      )}
      {' — '}
      <Link href="/openings" className="text-blue-600 hover:underline dark:text-blue-400">
        see your opening stats
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
          ? 'border-accent bg-accent/20 text-white'
          : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  )
}
