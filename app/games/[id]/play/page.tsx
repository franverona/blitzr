import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getGame } from '../../../actions'
import { BotPlayout } from '@/components/BotPlayout'
import { LINK_CLASS } from '@/components/styles'
import { DEFAULT_BOT_ELO, isBotElo } from '@/lib/botStrength'
import { getStrings } from '@/lib/i18n/strings'
import { isStandardChess } from '@/lib/positions'
import { practiceStart } from '@/lib/practiceGame'
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
  // A practice game isn't practiced again: its own positions aren't in a game the user played.
  if (!game?.movesSan || !isStandardChess(game) || game.practiceOf) notFound()

  const plyParam = Number(query.ply)
  const ply = Number.isInteger(plyParam) ? Math.min(Math.max(plyParam, 0), game.movesSan.length) : 0
  // Rebuilt from the stored game, never taken from the URL.
  const { fen, myColor } = practiceStart(game, ply)
  const eloParam = Number(query.elo)
  const elo = isBotElo(eloParam) ? eloParam : DEFAULT_BOT_ELO

  return (
    <div className="flex flex-col gap-4">
      {/* One quiet line instead of PageHeader, so the board gets the height. */}
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href={`/games/${game.id}?ply=${ply}`} className={LINK_CLASS}>
          {s.playBot.backToGame}
        </Link>
        <span aria-hidden>·</span>
        <h1 className="font-medium text-zinc-700 dark:text-zinc-300">{s.playBot.title}</h1>
        <span aria-hidden>·</span>
        <span>
          {ply > 0
            ? s.playBot.subtitle(`${plyLabel(ply, game.initialFen)} ${game.movesSan[ply - 1]}`)
            : s.playBot.fromStart}
        </span>
      </div>
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
