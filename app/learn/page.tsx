'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MiniBoard } from '@/components/MiniBoard'
import { ENDGAME_LESSONS } from '@/lib/endgameTheory'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { OPENING_LESSONS } from '@/lib/openingTheory'
import { buildPositions } from '@/lib/positions'
import type { Lesson } from '@/lib/types'

type Category = 'openings' | 'endgames'

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

function CategoryTab({
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

export default function LearnPage() {
  const s = getStrings()
  const [category, setCategory] = useState<Category>('openings')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{s.learnPage.title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.learnPage.intro}</p>

      <div className="flex items-center gap-2">
        <CategoryTab
          label={s.nav.openings}
          active={category === 'openings'}
          onClick={() => setCategory('openings')}
        />
        <CategoryTab
          label={s.learnPage.endgames}
          active={category === 'endgames'}
          onClick={() => setCategory('endgames')}
        />
      </div>

      <LessonGrid lessons={category === 'openings' ? OPENING_LESSONS : ENDGAME_LESSONS} />
    </div>
  )
}
