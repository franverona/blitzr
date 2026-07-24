import Link from 'next/link'
import { MiniBoard } from '@/components/MiniBoard'
import { ENDGAME_LESSONS } from '@/lib/endgameTheory'
import { getLocale } from '@/lib/i18n/locale'
import type { Locale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { OPENING_LESSONS } from '@/lib/openingTheory'
import { buildPositions } from '@/lib/positions'
import type { Lesson } from '@/lib/types'

function LessonGrid({ lessons, locale }: { lessons: Lesson[]; locale: Locale }) {
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

export default function LearnPage() {
  const s = getStrings()
  const locale = getLocale()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{s.learnPage.title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.learnPage.intro}</p>

      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {s.nav.openings}
      </h2>
      <LessonGrid lessons={OPENING_LESSONS} locale={locale} />

      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {s.learnPage.endgames}
      </h2>
      <LessonGrid lessons={ENDGAME_LESSONS} locale={locale} />
    </div>
  )
}
