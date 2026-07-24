import { getBlunderStats } from '../actions'
import { BlunderStats } from '@/components/BlunderStats'
import { getStrings } from '@/lib/i18n/strings'

export default async function BlundersPage() {
  const stats = await getBlunderStats()
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{s.blundersPage.title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {s.blundersPage.summary(stats.totalBlunders, stats.analyzedGames, stats.totalGames)}
      </p>
      <BlunderStats stats={stats} />
    </div>
  )
}
