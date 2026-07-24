'use client'

import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/dates'
import { getStrings } from '@/lib/i18n/strings'
import type { Game } from '@/lib/types'
import { KnightIcon } from './KnightIcon'

const RESULT_BADGE_STYLES: Record<Game['myResult'], string> = {
  win: 'bg-emerald-900/40 text-emerald-400',
  draw: 'bg-zinc-700/50 text-zinc-300',
  loss: 'bg-rose-900/40 text-rose-400',
}

export function GameRow({ game }: { game: Game }) {
  const s = getStrings()
  const router = useRouter()
  const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername
  const date = formatDate(game.endTime)
  const timeClassTooltip = s.gameRow.timeClassTooltips[game.timeClass]

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
          className={`rounded px-2 py-0.5 text-xs font-medium ${RESULT_BADGE_STYLES[game.myResult]}`}
        >
          {s.common.result[game.myResult]}
        </span>
      </td>
      <td className="px-3 py-2 text-zinc-400">{game.ecoName ?? '—'}</td>
      <td className="px-3 py-2 text-zinc-400">
        {timeClassTooltip ? (
          <abbr title={timeClassTooltip}>
            {s.common.timeClass[game.timeClass as keyof typeof s.common.timeClass] ??
              game.timeClass}
          </abbr>
        ) : (
          game.timeClass
        )}
      </td>
    </tr>
  )
}
