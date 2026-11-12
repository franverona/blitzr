import Link from 'next/link'
import { MiniBoard } from '@/components/MiniBoard'
import { ENDGAME_LESSONS } from '@/lib/endgameTheory'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { OPENING_LESSONS } from '@/lib/openingTheory'
import { POSITION_LESSONS } from '@/lib/positionTheory'
import { buildPositions } from '@/lib/positions'
import type { Lesson } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { chipClass } from '@/components/styles'

type Category = 'openings' | 'endgames' | 'positions'
type ColorFilter = 'all' | 'white' | 'black'
type GoalFilter = 'all' | 'win' | 'draw'

const LESSONS: Record<Category, Lesson[]> = {
  openings: OPENING_LESSONS,
  endgames: ENDGAME_LESSONS,
  positions: POSITION_LESSONS,
}

function LessonGrid({ lessons }: { lessons: Lesson[] }) {
  const locale = getLocale()
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {lessons.map((lesson) => {
        const positions = buildPositions(
          lesson.initialFen,
          lesson.moves.map((move) => move.san),
        )
        return (
          <Link
            key={lesson.slug}
            href={`/learn/${lesson.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <MiniBoard fen={positions[positions.length - 1]} />
            <p className="text-center text-sm font-medium">{lesson.name[locale]}</p>
          </Link>
        )
      })}
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
  searchParams: Promise<{ category?: string; color?: string; goal?: string }>
}) {
  const s = getStrings()
  const params = await searchParams
  const category: Category =
    params.category === 'endgames' || params.category === 'positions' ? params.category : 'openings'
  const color: ColorFilter =
    params.color === 'white' || params.color === 'black' ? params.color : 'all'
  // Openings have nothing to play for, so no goal.
  const goal: GoalFilter =
    category !== 'openings' && (params.goal === 'win' || params.goal === 'draw')
      ? params.goal
      : 'all'

  const lessons = LESSONS[category].filter(
    (lesson) =>
      (color === 'all' || lesson.primaryColor === color) &&
      (goal === 'all' || (lesson.playGoal === 'draw') === (goal === 'draw')),
  )

  function hrefFor(next: { category?: Category; color?: ColorFilter; goal?: GoalFilter }) {
    const merged = { category, color, goal, ...next }
    const query = new URLSearchParams()
    if (merged.category !== 'openings') query.set('category', merged.category)
    if (merged.color !== 'all') query.set('color', merged.color)
    if (merged.category !== 'openings' && merged.goal !== 'all') query.set('goal', merged.goal)
    const qs = query.toString()
    return qs ? `/learn?${qs}` : '/learn'
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={s.learnPage.title}
        subtitle={<p className="text-sm text-zinc-500 dark:text-zinc-400">{s.learnPage.intro}</p>}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <FilterTabs
          current={category}
          options={[
            { value: 'openings', label: s.nav.openings },
            { value: 'endgames', label: s.learnPage.endgames },
            { value: 'positions', label: s.learnPage.positions },
          ]}
          hrefFor={(value) => hrefFor({ category: value })}
        />
        <FilterTabs
          current={color}
          options={[
            { value: 'all', label: s.puzzlesPage.filters.allColors },
            { value: 'white', label: s.common.color.white },
            { value: 'black', label: s.common.color.black },
          ]}
          hrefFor={(value) => hrefFor({ color: value })}
        />
        {category !== 'openings' && (
          <FilterTabs
            current={goal}
            options={[
              { value: 'all', label: s.learnPage.allGoals },
              { value: 'win', label: s.learnPage.goalWin },
              { value: 'draw', label: s.learnPage.goalDraw },
            ]}
            hrefFor={(value) => hrefFor({ goal: value })}
          />
        )}
      </div>

      {lessons.length > 0 ? (
        <LessonGrid lessons={lessons} />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.learnPage.noMatches}</p>
      )}
    </div>
  )
}
