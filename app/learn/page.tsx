import Link from 'next/link'
import { getLessonProgress } from '@/app/actions'
import { Badge } from '@/components/Badge'
import { MiniBoard } from '@/components/MiniBoard'
import { NavSelect } from '@/components/NavSelect'
import { ENDGAME_LESSONS } from '@/lib/endgameTheory'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { OPENING_LESSONS } from '@/lib/openingTheory'
import { POSITION_LESSONS } from '@/lib/positionTheory'
import { buildPositions } from '@/lib/positions'
import { isLessonDone } from '@/lib/today'
import { isApproximateElo, isBotElo } from '@/lib/botStrength'
import type { Lesson, LessonProgress } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { chipClass } from '@/components/styles'

type Category = 'openings' | 'defenses' | 'endgames' | 'positions'
type ColorFilter = 'all' | 'white' | 'black'
type GoalFilter = 'all' | 'win' | 'draw'
type StatusFilter = 'all' | 'pending' | 'done'

// A defense is an opening lesson framed for Black.
const LESSONS: Record<Category, Lesson[]> = {
  openings: OPENING_LESSONS.filter((lesson) => lesson.primaryColor === 'white'),
  defenses: OPENING_LESSONS.filter((lesson) => lesson.primaryColor === 'black'),
  endgames: ENDGAME_LESSONS,
  positions: POSITION_LESSONS,
}

/** `showStart`: a classic position is recognized by its starting diagram, an opening or a mate by
 *  where its line ends. */
function LessonGrid({
  lessons,
  showStart,
  progress,
}: {
  lessons: Lesson[]
  showStart: boolean
  progress: Record<string, LessonProgress>
}) {
  const locale = getLocale()
  const s = getStrings()
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {lessons.map((lesson) => {
        const fen = showStart
          ? lesson.initialFen
          : buildPositions(
              lesson.initialFen,
              lesson.moves.map((move) => move.san),
            ).at(-1)!
        return (
          <Link
            key={lesson.slug}
            href={`/learn/${lesson.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-zinc-300 bg-white p-2 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-transparent dark:shadow-none dark:hover:bg-zinc-900"
          >
            <MiniBoard fen={fen} />
            <p className="text-center text-sm font-medium">{lesson.name[locale]}</p>
            <ProgressBadges lesson={lesson} progress={progress[lesson.slug]} s={s} />
          </Link>
        )
      })}
    </div>
  )
}

function ProgressBadges({
  lesson,
  progress,
  s,
}: {
  lesson: Lesson
  progress: LessonProgress | undefined
  s: ReturnType<typeof getStrings>
}) {
  if (!progress) return null
  const elo = progress.playWon?.elo ?? null
  const level =
    elo !== null && isBotElo(elo)
      ? s.playBot.eloLabel(elo, isApproximateElo(elo))
      : s.playBot.fullStrength
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {progress.quizCompleted && <Badge tone="emerald">{s.learnPage.quizDone}</Badge>}
      {progress.playWon && (
        <Badge tone="emerald">
          {lesson.playGoal === 'draw' ? s.learnPage.heldAt(level) : s.learnPage.wonAt(level)}
        </Badge>
      )}
    </div>
  )
}

function FilterTabs<T extends string>({
  current,
  options,
  hrefFor,
}: {
  current: T
  options: { value: T; label: string }[]
  hrefFor: (value: T) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((tab) => (
        <Link
          key={tab.value}
          href={hrefFor(tab.value)}
          className={chipClass(current === tab.value)}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

/** URL-driven filters, like /puzzles: `?category=…&color=…&goal=…`. */
export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; color?: string; goal?: string; status?: string }>
}) {
  const s = getStrings()
  const params = await searchParams
  const category: Category =
    params.category === 'defenses' ||
    params.category === 'endgames' ||
    params.category === 'positions'
      ? params.category
      : 'openings'
  // Openings and defenses are one color each and have nothing to play for: no color or goal.
  const isOpening = category === 'openings' || category === 'defenses'
  const color: ColorFilter =
    !isOpening && (params.color === 'white' || params.color === 'black') ? params.color : 'all'
  const goal: GoalFilter =
    !isOpening && (params.goal === 'win' || params.goal === 'draw') ? params.goal : 'all'

  const status: StatusFilter =
    params.status === 'pending' || params.status === 'done' ? params.status : 'all'
  const progress = await getLessonProgress()

  const lessons = LESSONS[category].filter(
    (lesson) =>
      (color === 'all' || lesson.primaryColor === color) &&
      (goal === 'all' || (lesson.playGoal === 'draw') === (goal === 'draw')) &&
      (status === 'all' || isLessonDone(progress[lesson.slug], !isOpening) === (status === 'done')),
  )

  function hrefFor(next: {
    category?: Category
    color?: ColorFilter
    goal?: GoalFilter
    status?: StatusFilter
  }) {
    const merged = { category, color, goal, status, ...next }
    const mergedIsOpening = merged.category === 'openings' || merged.category === 'defenses'
    const query = new URLSearchParams()
    if (merged.category !== 'openings') query.set('category', merged.category)
    if (!mergedIsOpening && merged.color !== 'all') query.set('color', merged.color)
    if (!mergedIsOpening && merged.goal !== 'all') query.set('goal', merged.goal)
    if (merged.status !== 'all') query.set('status', merged.status)
    const qs = query.toString()
    return qs ? `/learn?${qs}` : '/learn'
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={s.learnPage.title}
        subtitle={<p className="text-sm text-zinc-600 dark:text-zinc-400">{s.learnPage.intro}</p>}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <FilterTabs
          current={category}
          options={[
            { value: 'openings', label: s.nav.openings },
            { value: 'defenses', label: s.learnPage.defenses },
            { value: 'endgames', label: s.learnPage.endgames },
            { value: 'positions', label: s.learnPage.positions },
          ]}
          hrefFor={(value) => hrefFor({ category: value })}
        />
        {!isOpening && (
          <NavSelect
            label={s.learnPage.colorFilter}
            value={color}
            options={(['all', 'white', 'black'] as const).map((value) => ({
              value,
              label: value === 'all' ? s.puzzlesPage.filters.allColors : s.common.color[value],
              href: hrefFor({ color: value }),
            }))}
          />
        )}
        {!isOpening && (
          <NavSelect
            label={s.learnPage.goalFilter}
            value={goal}
            options={[
              { value: 'all', label: s.learnPage.allGoals },
              { value: 'win', label: s.learnPage.goalWin },
              { value: 'draw', label: s.learnPage.goalDraw },
            ].map((option) => ({ ...option, href: hrefFor({ goal: option.value as GoalFilter }) }))}
          />
        )}
        <NavSelect
          label={s.learnPage.statusFilter}
          value={status}
          options={(['all', 'pending', 'done'] as const).map((value) => ({
            value,
            label: s.learnPage.status[value],
            href: hrefFor({ status: value }),
          }))}
        />
      </div>

      {lessons.length > 0 ? (
        <LessonGrid lessons={lessons} showStart={category === 'positions'} progress={progress} />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.learnPage.noMatches}</p>
      )}
    </div>
  )
}
