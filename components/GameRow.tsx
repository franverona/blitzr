'use client'

import Link from 'next/link'
import { formatTimeControl } from '@/lib/clock'
import { coachRating } from '@/lib/chesscom/normalize'
import { formatDate, formatDateTime } from '@/lib/dates'
import { getStrings } from '@/lib/i18n/strings'
import type { Game, GameAccuracy } from '@/lib/types'
import { SiteIcon } from './SiteIcon'
import { Badge } from './Badge'
import { FavoriteButton } from './FavoriteButton'
import { KnightIcon } from './KnightIcon'
import { BulletIcon, HourglassIcon, SunIcon, TimerIcon, ZapIcon } from './NavIcons'
import { ResultBadge } from './ResultBadge'
import { Spinner } from './Spinner'
import { useBulkAnalysis } from './BulkAnalysisProvider'
import { accuracyTone } from './styles'

const TIME_CLASS_ICONS: Record<string, typeof ZapIcon | undefined> = {
  ultraBullet: BulletIcon,
  bullet: BulletIcon,
  blitz: ZapIcon,
  rapid: TimerIcon,
  classical: HourglassIcon,
  daily: SunIcon,
  correspondence: SunIcon,
}

// Off the row's result/accuracy hues (emerald, rose, amber).
const TIME_CLASS_COLORS: Record<string, string> = {
  ultraBullet: 'text-orange-600 dark:text-orange-400',
  bullet: 'text-orange-600 dark:text-orange-400',
  blitz: 'text-yellow-600 dark:text-yellow-400',
  rapid: 'text-teal-600 dark:text-teal-400',
  classical: 'text-sky-600 dark:text-sky-400',
  daily: 'text-violet-600 dark:text-violet-400',
  correspondence: 'text-violet-600 dark:text-violet-400',
}

export function GameRow({
  game,
  accuracy,
  select,
}: {
  game: Game
  accuracy: GameAccuracy | undefined
  /** A leading checkbox cell, for bulk selection. */
  select?: { checked: boolean; onToggle: () => void }
}) {
  const s = getStrings()
  const { progress } = useBulkAnalysis()
  const analyzing = progress?.gameId === game.id
  const coachElo = coachRating(game)
  const opponent = game.myColor === 'white' ? game.blackUsername : game.whiteUsername
  const myRating = game.myColor === 'white' ? game.whiteRating : game.blackRating
  // An unrated game's rating isn't meaningful, except the coach's elo.
  const opponentRating =
    coachElo ??
    (game.rated ? (game.myColor === 'white' ? game.blackRating : game.whiteRating) : null)
  const date = formatDate(game.endTime)
  const timeClassLabel =
    s.common.timeClass[game.timeClass as keyof typeof s.common.timeClass] ?? game.timeClass
  const timeControl = formatTimeControl(game.timeControl, s.gameRow.days)
  const TimeClassIcon = TIME_CLASS_ICONS[game.timeClass]

  const href = `/games/${game.id}`

  return (
    <tr className="focus-within:bg-zinc-100 hover:bg-zinc-100 dark:focus-within:bg-zinc-900/50 dark:hover:bg-zinc-900/50">
      {select && (
        <td className="px-3 py-2">
          <input
            type="checkbox"
            className="block"
            aria-label={s.gameList.selectGame}
            checked={select.checked}
            onChange={select.onToggle}
          />
        </td>
      )}
      {/* Outside the cell links, so starring doesn't open the game. Practice games can't be starred. */}
      {!game.practiceOf && (
        <td className="py-1 pl-2">
          <FavoriteButton gameId={game.id} favorite={game.favorite ?? false} />
        </td>
      )}
      <Cell href={href} className="whitespace-nowrap" tabbable>
        <span title={formatDateTime(game.endTime)}>{date}</span>
      </Cell>
      <Cell href={href}>{game.isMine ? <KnightIcon color={game.myColor} /> : '—'}</Cell>
      {/* A practice game was played here, on neither site. */}
      <Cell href={href}>{game.practiceOf ? '—' : <SiteIcon site={game.site} />}</Cell>
      <Cell href={href}>
        {game.isMine ? (
          <span className="flex flex-col leading-tight">
            {opponent}
            {opponentRating != null && (
              <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {opponentRating}
              </span>
            )}
          </span>
        ) : (
          `${game.whiteUsername} ${s.common.vs} ${game.blackUsername}`
        )}
      </Cell>
      <Cell href={href}>
        {game.isMine ? (
          <ResultBadge result={game.myResult} />
        ) : (
          <Badge tone="zinc">{s.gameRow.notMine}</Badge>
        )}
      </Cell>
      <Cell href={href} className="justify-end text-zinc-500 tabular-nums dark:text-zinc-400">
        {/* An unrated game's rating isn't meaningful. */}
        {game.isMine && game.rated && myRating != null ? myRating : '—'}
      </Cell>
      <Cell href={href} className="justify-center">
        {accuracy ? (
          <Badge tone={accuracyTone(accuracy.accuracy)} shape="pill" className="tabular-nums">
            {accuracy.accuracy}
          </Badge>
        ) : analyzing ? (
          <Spinner
            role="status"
            aria-label={s.bulkAnalyze.analyzingProgress(
              progress.gamesDone + 1,
              progress.gamesTotal,
            )}
            title={s.bulkAnalyze.analyzingProgress(progress.gamesDone + 1, progress.gamesTotal)}
          />
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
      <Cell href={href} className="whitespace-nowrap text-zinc-500 dark:text-zinc-400">
        {game.timeClass === 'unknown' ? (
          <span className="text-zinc-300 dark:text-zinc-700">—</span>
        ) : (
          <>
            {TimeClassIcon && (
              <TimeClassIcon
                className={`mr-1.5 size-3.5 shrink-0 ${TIME_CLASS_COLORS[game.timeClass]}`}
              />
            )}
            {timeClassLabel}
            {timeControl && <span className="ml-1.5 tabular-nums">({timeControl})</span>}
          </>
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
