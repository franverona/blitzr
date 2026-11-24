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
import { LINK_CLASS, tabClass } from './styles'

type Mode = 'study' | 'quiz' | 'play'

// Shared by every mode, so switching keeps the board's size. lg+: 3.5rem ≈ chrome above/below the
// board (padding, coordinates).
const BOARD_MAX_WIDTH =
  'max-w-160 lg:max-w-[min(52rem,calc(100dvh-3.5rem))] xl:max-w-[min(56rem,calc(100dvh-3.5rem))] 2xl:max-w-[min(60rem,calc(100dvh-3.5rem))]'

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

  // Title, modes and actions top the sidebar (no header row, so the board gets the room).
  const header = (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-base font-semibold">{lesson.name[locale]}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <FlipBoardButton />
          <AboutOpeningButton
            name={lesson.name[locale]}
            summary={lesson.summary[locale]}
            sourceUrl={lesson.sourceUrl}
          />
        </div>
      </div>
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
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
      </div>
      {gameStats && (
        <div className="flex flex-col items-start gap-2">
          <LessonGameStats stats={gameStats} />
          {/* Opening lessons only (they have game stats); the others start from a FEN. */}
          <AddLessonToRepertoireButton slug={lesson.slug} color={lesson.primaryColor} />
        </div>
      )}
      {endgameGames && <EndgameGames stats={endgameGames} />}
    </div>
  )

  return (
    <BoardProvider
      key={mode}
      initialFen={lesson.initialFen}
      movesSan={movesSan}
      boardOrientation={resolveOrientation(trainingOrientation, lesson.primaryColor)}
      myColor={lesson.primaryColor}
      initialPly={mode === 'study' ? 1 : 0}
    >
      {mode === 'study' ? (
        <BoardView
          boardMaxWidthClassName={BOARD_MAX_WIDTH}
          sidebarMaxWidthClassName="lg:max-w-xs xl:max-w-sm"
          showMaterial={false}
          sidebarHeader={header}
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
          boardMaxWidthClassName={BOARD_MAX_WIDTH}
          header={header}
          sidebarExtra={<MoveExplanation moves={lesson.moves} />}
          onComplete={() =>
            markLessonQuizCompleted(lesson.slug).catch(() =>
              toast.error(s.lessonPractice.progressSaveFailed, { id: 'lesson-progress' }),
            )
          }
        />
      ) : (
        <EndgamePlayout lesson={lesson} header={header} boardMaxWidthClassName={BOARD_MAX_WIDTH} />
      )}
    </BoardProvider>
  )
}

function LessonGameStats({ stats }: { stats: LessonGameStatsData }) {
  const s = getStrings()
  return (
    <p className="text-xs text-zinc-600 dark:text-zinc-400">
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
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{s.lessonPractice.neverReached}</p>
    )
  }
  return (
    <p className="text-xs text-zinc-600 dark:text-zinc-400">
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
    <button onClick={onClick} aria-pressed={active} className={`flex-1 ${tabClass(active)}`}>
      {label}
    </button>
  )
}
