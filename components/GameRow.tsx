'use client'

import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/dates'
import type { Game } from '@/lib/types'
import { KnightIcon } from './KnightIcon'

const RESULT_BADGE_STYLES: Record<Game['myResult'], string> = {
  win: 'bg-emerald-900/40 text-emerald-400',
  draw: 'bg-zinc-700/50 text-zinc-300',
  loss: 'bg-rose-900/40 text-rose-400',
}

const TIME_CLASS_TOOLTIPS: Record<string, string> = {
  bullet: 'Bullet — under 3 minutes per player',
  blitz: 'Blitz — 3 to 10 minutes per player',
  rapid: 'Rapid — 10 to 30 minutes per player',
  daily: 'Daily — correspondence chess, days per move rather than a running clock',
}

export function GameRow({ game }: { game: Game }) {
  const router = useRouter()
  const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername
  const date = formatDate(game.endTime)

  function open() {
    router.push(`/games/${game.id}`)
  }

  return (
    <tr
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      tabIndex={0}
      className="cursor-pointer outline-none hover:bg-zinc-900/50 focus:bg-zinc-900/50"
    >
      <td className="px-3 py-2 whitespace-nowrap">{date}</td>
      <td className="px-3 py-2">
        <KnightIcon color={game.myColor} />
      </td>
      <td className="px-3 py-2">{opponent}</td>
      <td className="px-3 py-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${RESULT_BADGE_STYLES[game.myResult]}`}
        >
          {game.myResult}
        </span>
      </td>
      <td className="px-3 py-2 text-zinc-400">{game.ecoName ?? '—'}</td>
      <td className="px-3 py-2 text-zinc-400 capitalize">
        {TIME_CLASS_TOOLTIPS[game.timeClass] ? (
          <abbr title={TIME_CLASS_TOOLTIPS[game.timeClass]}>{game.timeClass}</abbr>
        ) : (
          game.timeClass
        )}
      </td>
    </tr>
  )
}
