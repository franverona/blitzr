'use client'

import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/dates'
import { getStrings } from '@/lib/i18n/strings'
import type { Game, GameAccuracy } from '@/lib/types'
import { accuracyPillClass } from './GameAnalysisPanel'
import { KnightIcon } from './KnightIcon'
import { startRouteProgress } from './RouteProgressBar'

const RESULT_BADGE_STYLES: Record<Game['myResult'], string> = {
  win: 'bg-emerald-900/40 text-emerald-400',
  draw: 'bg-zinc-700/50 text-zinc-300',
  loss: 'bg-rose-900/40 text-rose-400',
}

// ponytail: plain unicode glyphs, not an icon component/library — three
// static characters don't earn an SVG asset.
const RESULT_BADGE_GLYPHS: Record<Game['myResult'], string> = {
  win: '▲',
  draw: '●',
  loss: '▼',
}

export function GameRow({ game, accuracy }: { game: Game; accuracy: GameAccuracy | undefined }) {
  const s = getStrings()
  const router = useRouter()
  const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername
  const myRating = game.myColor === 'white' ? game.whiteRating : game.blackRating
  const date = formatDate(game.endTime)
  const timeClassTooltip = s.gameRow.timeClassTooltips[game.timeClass]

  function open() {
    startRouteProgress()
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
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${RESULT_BADGE_STYLES[game.myResult]}`}
        >
          <span aria-hidden="true">{RESULT_BADGE_GLYPHS[game.myResult]}</span>
          {s.common.result[game.myResult]}
        </span>
      </td>
      <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">
        {/* Unrated games (bot/coach practice, manually-added PGNs) don't
         *  carry a meaningful rating number — the account's snapshot rating
         *  shows up regardless, but it isn't *this game's* rating. */}
        {game.rated && myRating != null ? myRating : '—'}
      </td>
      <td className="px-3 py-2 text-center">
        {accuracy ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${accuracyPillClass(accuracy.accuracy)}`}
          >
            {accuracy.accuracy}
          </span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center tabular-nums">
        {accuracy ? (
          <span className="inline-flex items-center gap-1.5">
            <abbr title={s.blunderBadge.titles.mistake} className="text-amber-400 no-underline">
              {accuracy.mistakes}
            </abbr>
            <span className="text-zinc-700">/</span>
            <abbr title={s.blunderBadge.titles.blunder} className="text-rose-400 no-underline">
              {accuracy.blunders}
            </abbr>
          </span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
      </td>
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
