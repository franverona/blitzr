import { getStrings } from '@/lib/i18n/strings'
import type { Game, GameAccuracy } from '@/lib/types'
import { GameRow } from './GameRow'
import { TableShell } from './TableShell'

export function GameList({
  games,
  accuracyByGameId,
  filtered,
}: {
  games: Game[]
  /** Any filter is active, so an empty list means "no matches", not "no games". */
  filtered: boolean
  /** Own-side accuracy per analyzed game. */
  accuracyByGameId: Record<string, GameAccuracy>
}) {
  const s = getStrings()

  if (games.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {filtered ? s.gameList.noMatches : s.gameList.empty}
      </p>
    )
  }

  return (
    <TableShell
      head={
        <>
          <th className="px-3 py-2">{s.gameList.headers.date}</th>
          <th className="px-3 py-2">{s.gameList.headers.color}</th>
          <th className="px-3 py-2">{s.gameList.headers.opponent}</th>
          <th className="px-3 py-2">{s.gameList.headers.result}</th>
          <th className="px-3 py-2 text-right">{s.gameList.headers.rating}</th>
          <th className="px-3 py-2 text-center">{s.gameList.headers.accuracy}</th>
          <th className="px-3 py-2 text-center">{s.gameList.headers.errors}</th>
          <th className="px-3 py-2">{s.gameList.headers.timeClass}</th>
        </>
      }
    >
      {games.map((game) => (
        <GameRow key={game.id} game={game} accuracy={accuracyByGameId[game.id]} />
      ))}
    </TableShell>
  )
}
