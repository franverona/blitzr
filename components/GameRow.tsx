'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/dates'
import { getStrings } from '@/lib/i18n/strings'
import type { Game, GameAccuracy } from '@/lib/types'
import { Badge } from './Badge'
import { KnightIcon } from './KnightIcon'
import { ResultBadge } from './ResultBadge'
import { accuracyTone } from './styles'

export function GameRow({ game, accuracy }: { game: Game; accuracy: GameAccuracy | undefined }) {
  const s = getStrings()
  const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername
  const myRating = game.myColor === 'white' ? game.whiteRating : game.blackRating
  const date = formatDate(game.endTime)
  const timeClassTooltip = s.gameRow.timeClassTooltips[game.timeClass]

  const href = `/games/${game.id}`

  return (
    <tr className="focus-within:bg-zinc-100 hover:bg-zinc-100 dark:focus-within:bg-zinc-900/50 dark:hover:bg-zinc-900/50">
      <Cell href={href} className="whitespace-nowrap" tabbable>
        {date}
      </Cell>
      <Cell href={href}>{game.isMine ? <KnightIcon color={game.myColor} /> : '—'}</Cell>
      <Cell href={href}>
        {game.isMine ? opponent : `${game.whiteUsername} ${s.common.vs} ${game.blackUsername}`}
      </Cell>
      <Cell href={href}>
        {game.isMine ? (
          <ResultBadge result={game.myResult} />
        ) : (
          <Badge tone="zinc">{s.gameRow.notMine}</Badge>
        )}
      </Cell>
      <Cell href={href} className="justify-end text-zinc-400 tabular-nums">
        {/* An unrated game's rating isn't meaningful. */}
        {game.isMine && game.rated && myRating != null ? myRating : '—'}
      </Cell>
      <Cell href={href} className="justify-center">
        {accuracy ? (
          <Badge tone={accuracyTone(accuracy.accuracy)} shape="pill" className="tabular-nums">
            {accuracy.accuracy}
          </Badge>
        ) : (
          <span className="text-zinc-300 dark:text-zinc-700">—</span>
        )}
      </Cell>
      <Cell href={href} className="justify-center tabular-nums">
        {accuracy ? (
          <span className="inline-flex items-center gap-1.5">
            <abbr
              title={s.analysisPanel.moveQualityTitles.mistake}
              className="text-amber-600 no-underline dark:text-amber-400"
            >
              {accuracy.mistakes}
            </abbr>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <abbr
              title={s.analysisPanel.moveQualityTitles.blunder}
              className="text-rose-600 no-underline dark:text-rose-400"
            >
              {accuracy.blunders}
            </abbr>
          </span>
        ) : (
          <span className="text-zinc-300 dark:text-zinc-700">—</span>
        )}
      </Cell>
      <Cell href={href} className="text-zinc-400">
        {timeClassTooltip ? (
          <abbr title={timeClassTooltip}>
            {s.common.timeClass[game.timeClass as keyof typeof s.common.timeClass] ??
              game.timeClass}
          </abbr>
        ) : (
          game.timeClass
        )}
      </Cell>
    </tr>
  )
}

/** A real link per cell, so Cmd/middle-click open a tab anywhere on the row.
 *  Only the first is tabbable, so the keyboard stops once per row. */
function Cell({
  href,
  className = '',
  tabbable = false,
  children,
}: {
  href: string
  className?: string
  tabbable?: boolean
  children: React.ReactNode
}) {
  return (
    // h-px + h-full: the link fills the cell even when a sibling sets the row height.
    <td className="h-px p-0">
      <Link
        href={href}
        // 50 rows x 8 links; router.push() never prefetched either.
        prefetch={false}
        tabIndex={tabbable ? 0 : -1}
        className={`flex h-full items-center px-3 py-2 outline-none ${className}`}
      >
        {children}
      </Link>
    </td>
  )
}
