import { getStrings } from '@/lib/i18n/strings'
import type { Game } from '@/lib/types'
import { GameRow } from './GameRow'

export function GameList({ games }: { games: Game[] }) {
  const s = getStrings()
  if (games.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.gameList.empty}</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 text-left text-xs tracking-wide text-zinc-500 uppercase dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2">{s.gameList.headers.date}</th>
            <th className="px-3 py-2">{s.gameList.headers.color}</th>
            <th className="px-3 py-2">{s.gameList.headers.opponent}</th>
            <th className="px-3 py-2">{s.gameList.headers.result}</th>
            <th className="px-3 py-2">{s.gameList.headers.opening}</th>
            <th className="px-3 py-2">{s.gameList.headers.timeClass}</th>
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
