import { getBlunderStats } from '../actions'
import { BlunderStats } from '@/components/BlunderStats'

export default async function BlundersPage() {
  const stats = await getBlunderStats()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Blunders</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {stats.totalBlunders} {stats.totalBlunders === 1 ? 'blunder' : 'blunders'} across{' '}
        {stats.analyzedGames} of {stats.totalGames} synced games analyzed by Stockfish.
      </p>
      <BlunderStats stats={stats} />
    </div>
  )
}
