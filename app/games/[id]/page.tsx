import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getGame, getGameAnalysis, listRepertoire } from '../../actions'
import { Board } from '@/components/Board'
import { AnalyzeButton, GameAnalysisProvider } from '@/components/GameAnalysisPanel'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { fetchPlayerAvatar } from '@/lib/chesscom/client'
import { parsePgnHeaders } from '@/lib/chesscom/normalize'
import { formatDateTime } from '@/lib/dates'
import { diffGameAgainstRepertoire } from '@/lib/repertoire'
import { plyLabel } from '@/lib/san'
import type { Game, MyColor, MyResult, RepertoireDiffResult } from '@/lib/types'

function pgnResult(color: MyColor, result: MyResult): string {
  if (result === 'draw') return '1/2-1/2'
  const whiteWon = result === 'win' ? color === 'white' : color !== 'white'
  return whiteWon ? '1-0' : '0-1'
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const game = await getGame(id)
  if (!game) notFound()

  // "Play vs Coach" bot games get a url/PGN Link from Chess.com's API that
  // never resolves to the actual game — no correct link exists, so don't
  // show one rather than link somewhere wrong.
  const isBotGame = parsePgnHeaders(game.pgn).Event === 'Play vs Coach'
  const repertoireNodes = await listRepertoire(game.myColor)
  const diff = game.movesSan
    ? diffGameAgainstRepertoire(game.movesSan, game.myColor, repertoireNodes)
    : null
  const analysis = (await getGameAnalysis(id)) ?? null
  const [whiteAvatar, blackAvatar] = await Promise.all([
    fetchPlayerAvatar(game.whiteUsername),
    fetchPlayerAvatar(game.blackUsername),
  ])

  const body = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <GameHeader
          game={game}
          isBotGame={isBotGame}
          whiteAvatar={whiteAvatar}
          blackAvatar={blackAvatar}
        />
        {game.movesSan && <AnalyzeButton />}
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
          result={pgnResult(game.myColor, game.myResult)}
          evals={analysis?.evals}
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

  if (!game.movesSan) return body

  return (
    <GameAnalysisProvider
      key={game.id}
      gameId={game.id}
      initialFen={game.initialFen}
      movesSan={game.movesSan}
      initialAnalysis={analysis}
    >
      {body}
    </GameAnalysisProvider>
  )
}

function GameHeader({
  game,
  isBotGame,
  whiteAvatar,
  blackAvatar,
}: {
  game: Game
  isBotGame: boolean
  whiteAvatar: string | null
  blackAvatar: string | null
}) {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <PlayerAvatar username={game.whiteUsername} avatarUrl={whiteAvatar} />
        {game.whiteUsername}
        <span className="text-sm font-normal text-zinc-500">vs</span>
        <PlayerAvatar username={game.blackUsername} avatarUrl={blackAvatar} />
        {game.blackUsername}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {formatDateTime(game.endTime)} · {game.timeClass} · playing {game.myColor} ·{' '}
        <span className="capitalize">{game.myResult}</span>
      </p>
      {game.ecoName && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {game.ecoName} ({game.ecoCode ?? 'no ECO'})
        </p>
      )}
      {!isBotGame && (
        <a
          href={game.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          View on Chess.com
        </a>
      )}
    </div>
  )
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
