import type { LearnedCounts } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { getLocale } from '@/lib/i18n/locale'
import type { DrillSourceType } from '@/lib/types'
import { SectionLabel } from './Card'

const TYPES: DrillSourceType[] = ['deviation', 'blunder', 'punish', 'mate']

/** Learned cards per type and the next week's load, under the page's filters. */
export function DrillProgress({
  forecast,
  learned,
}: {
  forecast: number[]
  learned: LearnedCounts
}) {
  const s = getStrings()
  const types = TYPES.filter((t) => learned[t])
  if (types.length === 0) return null
  const typeLabel: Record<DrillSourceType, string> = {
    deviation: s.drillFilters.deviations,
    blunder: s.drillFilters.blunders,
    punish: s.drillFilters.punishes,
    mate: s.drillFilters.mates,
  }
  const now = new Date()
  const weekday = new Intl.DateTimeFormat(getLocale(), { weekday: 'short' })
  const dayLabel = (i: number) =>
    i === 0
      ? s.drillProgress.laterToday
      : i === 1
        ? s.drillProgress.tomorrow
        : weekday.format(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))

  return (
    <section className="flex flex-wrap gap-x-10 gap-y-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>
          <abbr title={s.drillProgress.learnedTooltip}>{s.drillProgress.title}</abbr>
        </SectionLabel>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
          {types.map((t) => (
            <div key={t} className="contents">
              <dt className="text-zinc-500 dark:text-zinc-400">{typeLabel[t]}</dt>
              <dd className="text-zinc-800 tabular-nums dark:text-zinc-200">
                {s.drillProgress.learned(learned[t]!.learned, learned[t]!.total)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-2">
        <SectionLabel>
          <abbr title={s.drillProgress.forecastTooltip}>{s.drillProgress.forecast}</abbr>
        </SectionLabel>
        <ol className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {forecast.map((count, i) => (
            <li key={i} className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{dayLabel(i)}</span>
              <span
                className={`font-medium tabular-nums ${count === 0 ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-800 dark:text-zinc-200'}`}
              >
                {count}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
