import type { Game } from '@/lib/types'
import { GameRow } from './GameRow'

export function GameList({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No games synced yet. Click &ldquo;Sync games&rdquo; to fetch your Chess.com history.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 text-left text-xs tracking-wide text-zinc-500 uppercase dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Color</th>
            <th className="px-3 py-2">Opponent</th>
            <th className="px-3 py-2">Result</th>
            <th className="px-3 py-2">Opening</th>
            <th className="px-3 py-2">Time class</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {games.map((game) => (
            <GameRow key={game.id} game={game} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
