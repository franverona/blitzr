import { getBlunderStats } from '../actions'
import { AccuracyTrendChart } from '@/components/AccuracyTrendChart'
import { BlunderStats } from '@/components/BlunderStats'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { getStrings } from '@/lib/i18n/strings'

export default async function BlundersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from, to } = await searchParams
  const stats = await getBlunderStats({ from, to })
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">{s.blundersPage.title}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {s.blundersPage.summary(stats.totalBlunders, stats.analyzedGames, stats.totalGames)}
        </p>
      </div>

      <DateRangeFilter from={from} to={to} />

      {/* Outside BlunderStats' early returns: a clean stretch still has a trend. */}
      <AccuracyTrendChart points={stats.trend} />

      <BlunderStats stats={stats} />
    </div>
  )
}
