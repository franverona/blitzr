import { notFound } from 'next/navigation'
import { getGame, getGameAnalysis } from '../../actions'
import { BoardView } from '@/components/Board'
import { BoardProvider } from '@/components/BoardContext'
import { BoardNavControls } from '@/components/BoardNavControls'
import { LiveAnalysisProvider } from '@/components/LiveAnalysis'
import { DeleteGameButton } from '@/components/DeleteGameButton'
import {
  AnalyzeButton,
  GameAnalysisProvider,
  MoveQualityLink,
} from '@/components/GameAnalysisPanel'
import { LiveAnalysisPanel } from '@/components/LiveAnalysisPanel'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PositionActions } from '@/components/PositionActions'
import { ResultBadge } from '@/components/ResultBadge'
import { fetchBotAvatar, fetchPlayerAvatar } from '@/lib/chesscom/client'
import { isBareBotNameEvent, parsePgnHeaders } from '@/lib/chesscom/normalize'
import { formatDateTime } from '@/lib/dates'
import { getStrings } from '@/lib/i18n/strings'
import { isStandardChess } from '@/lib/positions'
import type { Game, MyColor, MyResult } from '@/lib/types'
import { LINK_CLASS } from '@/components/styles'

function pgnResult(color: MyColor, result: MyResult): string {
  if (result === 'draw') return '1/2-1/2'
  const whiteWon = result === 'win' ? color === 'white' : color !== 'white'
  return whiteWon ? '1-0' : '0-1'
}

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ply?: string }>
}) {
  const { id } = await params
  // `?ply=` deep-links a position (e.g. from Today's worst blunder); BoardProvider clamps it.
  const plyParam = Number((await searchParams).ply)
  const initialPly = Number.isInteger(plyParam) && plyParam >= 0 ? plyParam : 1
  const game = await getGame(id)
  if (!game) notFound()

  const event = parsePgnHeaders(game.pgn).Event
  // "Play vs Coach" games get a Link that points to an unrelated game.
  const isBotGame = event === 'Play vs Coach'
  // "Play vs Bot" opponents have a bare display name, not a real account.
  const botColor: MyColor | null = isBareBotNameEvent(event)
    ? game.myColor === 'white'
      ? 'black'
      : 'white'
    : null
  const analysis = (await getGameAnalysis(id)) ?? null
  const [whiteAvatar, blackAvatar] = await Promise.all([
    botColor === 'white'
      ? fetchBotAvatar(game.whiteUsername)
      : fetchPlayerAvatar(game.whiteUsername),
    botColor === 'black'
      ? fetchBotAvatar(game.blackUsername)
      : fetchPlayerAvatar(game.blackUsername),
  ])

  const body = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <GameHeader
          game={game}
          isBotGame={isBotGame}
          whiteAvatar={whiteAvatar}
          blackAvatar={blackAvatar}
        />
        <div className="flex flex-wrap items-center justify-end gap-4">
          {game.movesSan && isStandardChess(game) && <AnalyzeButton />}
          {game.archiveYm === 'manual' && <DeleteGameButton gameId={game.id} />}
        </div>
      </div>

      {game.movesSan ? (
        // lg+: 9.25rem ≈ chrome above/below the board.
        <BoardView
          boardMaxWidthClassName="max-w-160 lg:max-w-[min(40rem,calc(100dvh-9.25rem))] xl:max-w-[min(43rem,calc(100dvh-9.25rem))] 2xl:max-w-[min(46rem,calc(100dvh-9.25rem))]"
          sidebarMaxWidthClassName="lg:max-w-xs xl:max-w-sm"
          autoExplore
          sidebarTop={<LiveAnalysisPanel />}
          sidebarExtra={
            <div className="flex shrink-0 flex-col gap-3">
              <BoardNavControls />
              <PositionActions pgn={game.pgn} />
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {getStrings().gamePage.unparsedMoves}
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
    <BoardProvider
      key={game.id}
      initialFen={game.initialFen}
      movesSan={game.movesSan}
      boardOrientation={game.myColor}
      myColor={game.myColor}
      result={pgnResult(game.myColor, game.myResult)}
      finalResults={{ white: game.whiteResult, black: game.blackResult }}
      evals={analysis?.evals}
      initialPly={initialPly}
    >
      <GameAnalysisProvider
        key={game.id}
        gameId={game.id}
        initialFen={game.initialFen}
        movesSan={game.movesSan}
        myColor={game.myColor}
        initialAnalysis={analysis}
      >
        <LiveAnalysisProvider>{body}</LiveAnalysisProvider>
      </GameAnalysisProvider>
    </BoardProvider>
  )
}

function OpeningLine({ game }: { game: Game }) {
  const s = getStrings()
  if (!game.ecoName) return null
  return (
    <>
      {' · '}
      {game.ecoUrl ? (
        <a
          href={game.ecoUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={s.gamePage.learnMoreAboutOpening}
          className={LINK_CLASS}
        >
          {game.ecoName}
        </a>
      ) : (
        game.ecoName
      )}{' '}
      ({game.ecoCode ? <abbr title={s.gamePage.ecoTooltip}>{game.ecoCode}</abbr> : s.gamePage.noEco}
      )
    </>
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
  const s = getStrings()
  const timeClassLabel =
    s.common.timeClass[game.timeClass as keyof typeof s.common.timeClass] ?? game.timeClass
  return (
    // flex-1 + basis: a long opening name wraps here instead of overflowing the button row.
    <div className="flex flex-1 basis-64 flex-col gap-1.5">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <PlayerAvatar username={game.whiteUsername} avatarUrl={whiteAvatar} />
        {game.whiteUsername}
        <span className="text-sm font-normal text-zinc-500">{s.common.vs}</span>
        <PlayerAvatar username={game.blackUsername} avatarUrl={blackAvatar} />
        {game.blackUsername}
        {game.isMine && <ResultBadge result={game.myResult} />}
      </h1>
      {/* A div, not a <p>: MoveQualityLink renders a <dialog>. */}
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        {formatDateTime(game.endTime)} · {timeClassLabel}
        {!game.isMine && ` · ${s.gamePage.notMine}`}
        <OpeningLine game={game} />
        {game.movesSan && <MoveQualityLink />}
        {!isBotGame && game.url && (
          <>
            {' · '}
            <a href={game.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {s.gamePage.viewOnChessCom}
            </a>
          </>
        )}
      </div>
    </div>
  )
}
