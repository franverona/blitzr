import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getGame } from '../../../actions'
import { BotPlayout } from '@/components/BotPlayout'
import { PageHeader } from '@/components/PageHeader'
import { LINK_CLASS } from '@/components/styles'
import { DEFAULT_BOT_ELO, isBotElo } from '@/lib/botStrength'
import { getStrings } from '@/lib/i18n/strings'
import { buildPositions, isStandardChess } from '@/lib/positions'
import { plyLabel } from '@/lib/san'

export default async function PlayBotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ply?: string; elo?: string }>
}) {
  const s = getStrings()
  const { id } = await params
  const query = await searchParams
  const game = await getGame(id)
  if (!game?.movesSan || !isStandardChess(game)) notFound()

  // The FEN is rebuilt here from the stored game, never taken from the URL.
  const positions = buildPositions(game.initialFen, game.movesSan)
  const plyParam = Number(query.ply)
  const ply = Number.isInteger(plyParam) ? Math.min(Math.max(plyParam, 0), game.movesSan.length) : 0
  const fen = positions[ply]
  const eloParam = Number(query.elo)
  const elo = isBotElo(eloParam) ? eloParam : DEFAULT_BOT_ELO
  // A "not me" game has no user side, so the user takes the side to move.
  const myColor = game.isMine ? game.myColor : fen.split(' ')[1] === 'w' ? 'white' : 'black'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={s.playBot.title}
        subtitle={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {ply > 0
              ? s.playBot.subtitle(`${plyLabel(ply, game.initialFen)} ${game.movesSan[ply - 1]}`)
              : s.playBot.fromStart}
          </p>
        }
        actions={
          <Link href={`/games/${game.id}?ply=${ply}`} className={`text-sm ${LINK_CLASS}`}>
            {s.playBot.backToGame}
          </Link>
        }
      />
      <BotPlayout
        key={`${elo}-${ply}`}
        gameId={game.id}
        ply={ply}
        initialFen={fen}
        myColor={myColor}
        elo={elo}
      />
    </div>
  )
}
