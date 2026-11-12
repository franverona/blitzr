'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { markLessonQuizCompleted } from '@/app/actions'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { resolveOrientation } from '@/lib/theme'
import { formatDate } from '@/lib/dates'
import type {
  Lesson,
  LessonEndgameGames,
  LessonGameStats as LessonGameStatsData,
} from '@/lib/types'
import { AboutOpeningButton } from './AboutOpeningButton'
import { AddLessonToRepertoireButton } from './AddLessonToRepertoireButton'
import { BoardView } from './Board'
import { BoardProvider } from './BoardContext'
import { BoardNavControls } from './BoardNavControls'
import { EndgamePlayout } from './EndgamePlayout'
import { FlipBoardButton } from './FlipBoardButton'
import { LessonQuiz } from './LessonQuiz'
import { MoveExplanation } from './MoveExplanation'
import { useSettings } from './SettingsProvider'
import { PageHeader } from './PageHeader'
import { chipClass, LINK_CLASS } from './styles'

type Mode = 'study' | 'quiz' | 'play'

/** Study/Quiz (and, except for openings, Play) toggle. `key={mode}` resets the board on every switch. */
export function LessonPractice({
  lesson,
  gameStats,
  endgameGames,
}: {
  lesson: Lesson
  /** null for endgame and position lessons, which hides the section. */
  gameStats: LessonGameStatsData | null
  /** null for opening lessons. */
  endgameGames: LessonEndgameGames | null
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
        <PageHeader
          title={lesson.name[locale]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
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
              {/* Not for openings (they have game stats): there's no position to win from. */}
              {!gameStats && (
                <ModeTab
                  label={s.endgamePlayout.play}
                  active={mode === 'play'}
                  onClick={() => setMode('play')}
                />
              )}
              <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
              {/* Opening lessons only (they have game stats); the others start from a FEN. */}
              {gameStats && (
                <AddLessonToRepertoireButton slug={lesson.slug} color={lesson.primaryColor} />
              )}
              <FlipBoardButton />
              <AboutOpeningButton
                name={lesson.name[locale]}
                summary={lesson.summary[locale]}
                sourceUrl={lesson.sourceUrl}
              />
            </div>
          }
        />
        {gameStats && <LessonGameStats stats={gameStats} />}
        {endgameGames && <EndgameGames stats={endgameGames} />}
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
        ) : mode === 'quiz' ? (
          <LessonQuiz
            sidebarExtra={<MoveExplanation moves={lesson.moves} />}
            onComplete={() =>
              markLessonQuizCompleted(lesson.slug).catch(() =>
                toast.error(s.lessonPractice.progressSaveFailed, { id: 'lesson-progress' }),
              )
            }
          />
        ) : (
          <EndgamePlayout lesson={lesson} />
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
      <Link href="/openings" className={LINK_CLASS}>
        {s.lessonPractice.seeOpeningStats}
      </Link>
      .
    </p>
  )
}

function EndgameGames({ stats }: { stats: LessonEndgameGames }) {
  const s = getStrings()
  if (stats.games === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.lessonPractice.neverReached}</p>
    )
  }
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      {s.lessonPractice.reachedGames(stats.games, stats.wins, stats.draws, stats.losses)}
      {' — '}
      {stats.recent.map((game, i) => (
        <span key={game.gameId}>
          {i > 0 && ', '}
          <Link
            href={`/games/${game.gameId}?ply=${game.ply}`}
            title={formatDate(game.endTime)}
            className={LINK_CLASS}
          >
            {s.lessonPractice.reachedGame(game.opponent, s.common.result[game.myResult])}
          </Link>
        </span>
      ))}
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
    <button onClick={onClick} className={chipClass(active)}>
      {label}
    </button>
  )
}
