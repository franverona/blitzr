import { notFound } from 'next/navigation'
import { getGame } from '../../actions'
import { Board } from '@/components/Board'
import { formatDateTime } from '@/lib/dates'

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const game = await getGame(id)
  if (!game) notFound()

  const date = formatDateTime(game.endTime)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">
          {game.whiteUsername} vs {game.blackUsername}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {date} · {game.timeClass} · playing {game.myColor} ·{' '}
          <span className="capitalize">{game.myResult}</span>
        </p>
        {game.ecoName && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {game.ecoName} ({game.ecoCode ?? 'no ECO'})
          </p>
        )}
        <a
          href={game.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          View on Chess.com
        </a>
      </div>

      {game.movesSan ? (
        <Board
          initialFen={game.initialFen}
          movesSan={game.movesSan}
          boardOrientation={game.myColor}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This game&rsquo;s moves couldn&rsquo;t be parsed (likely a non-standard variant) —
            showing the raw PGN instead.
          </p>
          <pre className="overflow-x-auto rounded-md bg-zinc-100 p-3 text-xs whitespace-pre-wrap dark:bg-zinc-900">
            {game.pgn}
          </pre>
        </div>
      )}
    </div>
  )
}
