import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getGame, listRepertoire } from '../../actions'
import { Board } from '@/components/Board'
import { formatDateTime } from '@/lib/dates'
import { diffGameAgainstRepertoire } from '@/lib/repertoire'
import type { MyColor, RepertoireDiffResult } from '@/lib/types'

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const game = await getGame(id)
  if (!game) notFound()

  const date = formatDateTime(game.endTime)
  const repertoireNodes = await listRepertoire(game.myColor)
  const diff = game.movesSan
    ? diffGameAgainstRepertoire(game.movesSan, game.myColor, repertoireNodes)
    : null

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

      {diff && (
        <RepertoireDiff
          diff={diff}
          color={game.myColor}
          hasRepertoire={repertoireNodes.length > 0}
          totalPlies={game.movesSan?.length ?? 0}
        />
      )}

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

function plyLabel(ply: number): string {
  const moveNumber = Math.ceil(ply / 2)
  return ply % 2 === 1 ? `${moveNumber}.` : `${moveNumber}…`
}

function RepertoireDiff({
  diff,
  color,
  hasRepertoire,
  totalPlies,
}: {
  diff: RepertoireDiffResult
  color: MyColor
  hasRepertoire: boolean
  totalPlies: number
}) {
  if (!hasRepertoire) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No {color} repertoire defined yet —{' '}
        <Link
          href={`/repertoire?color=${color}`}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          build one
        </Link>
        .
      </p>
    )
  }

  if (diff.deviationPly !== null) {
    return (
      <p className="text-sm text-amber-600 dark:text-amber-400">
        In book for {diff.inBookPlies} {diff.inBookPlies === 1 ? 'move' : 'moves'}, then deviated on{' '}
        {plyLabel(diff.deviationPly)} — played{' '}
        <span className="font-medium">{diff.deviationMove}</span>, repertoire has{' '}
        <span className="font-medium">{diff.expectedMoves?.join(' or ')}</span>.
      </p>
    )
  }

  if (diff.inBookPlies === totalPlies && totalPlies > 0) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        Followed your repertoire the entire game ({diff.inBookPlies}{' '}
        {diff.inBookPlies === 1 ? 'move' : 'moves'}).
      </p>
    )
  }

  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      In book for {diff.inBookPlies} {diff.inBookPlies === 1 ? 'move' : 'moves'}, then left prepared
      territory.
    </p>
  )
}
