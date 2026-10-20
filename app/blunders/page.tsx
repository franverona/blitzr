import { getBlunderStats } from '../actions'
import { AccuracyTrendChart } from '@/components/AccuracyTrendChart'
import { BlunderStats } from '@/components/BlunderStats'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { getStrings } from '@/lib/i18n/strings'
import { PageHeader } from '@/components/PageHeader'

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
      <PageHeader
        title={s.blundersPage.title}
        subtitle={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {s.blundersPage.summary(stats.totalBlunders, stats.analyzedGames, stats.totalGames)}
          </p>
        }
      />

      <DateRangeFilter from={from} to={to} />

      {/* Outside BlunderStats' early returns: a clean stretch still has a trend. */}
      <AccuracyTrendChart points={stats.trend} />

      <BlunderStats stats={stats} />
    </div>
  )
}
