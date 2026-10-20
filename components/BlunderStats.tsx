'use client'

import Link from 'next/link'
import { formatEval, formatSwing } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { plyLabel } from '@/lib/san'
import type { SanPiece } from '@/lib/san'
import { describeBlunderReason } from '@/lib/tactics'
import type { BlunderStats as BlunderStatsData } from '@/lib/types'
import { BlunderSeverityBadge } from './BlunderSeverityBadge'
import { SectionLabel } from './Card'
import { LINK_CLASS } from './styles'
import { TableShell } from './TableShell'
import { useSettings } from './SettingsProvider'
import { EvalHelp } from './EvalHelp'
import { PieceGlyph } from './PieceGlyph'

const PIECE_KEYS: ReadonlySet<string> = new Set(['K', 'Q', 'R', 'B', 'N'])

export function BlunderStats({ stats }: { stats: BlunderStatsData }) {
  const s = getStrings()
  const boardColors = useSettings()
  if (stats.analyzedGames === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.blunderStats.emptyNoAnalyzed}</p>
    )
  }

  if (stats.totalBlunders === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {s.blunderStats.emptyNoBlunders(stats.analyzedGames)}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <SectionLabel>{s.blunderStats.byOpening}</SectionLabel>
        <TableShell
          head={
            <>
              <th className="px-3 py-2">{s.openingsTable.headers.opening}</th>
              <th className="px-3 py-2">{s.nav.blunders}</th>
              <th className="px-3 py-2">
                <abbr title={s.blunderStats.avgSwingTooltip}>{s.blunderStats.avgSwing}</abbr>
              </th>
            </>
          }
        >
          {stats.byOpening.map((group) => (
            <tr key={group.key}>
              <td className="px-3 py-2 font-medium">{group.label}</td>
              <td className="px-3 py-2">{group.count}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                {group.avgSwingCp !== null ? s.common.pawns(group.avgSwingCp / 100) : '—'}
              </td>
            </tr>
          ))}
        </TableShell>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>{s.blunderStats.byPiece}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {stats.byPiece.map((group) => (
            <div
              key={group.key}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm dark:border-zinc-800"
            >
              {PIECE_KEYS.has(group.key) && (
                <span
                  className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm"
                  style={{ backgroundColor: boardColors.dark }}
                >
                  <PieceGlyph piece={group.key as SanPiece} color="white" className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="font-medium">{group.label}</span>
              <span className="text-zinc-500 dark:text-zinc-400">×{group.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>{s.blunderStats.worstBlunders}</SectionLabel>
        <ul className="flex flex-col gap-1.5 text-sm">
          {stats.worst.map((b) => (
            <li key={`${b.gameId}-${b.ply}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/games/${b.gameId}`} className={LINK_CLASS}>
                  {b.gameLabel}
                </Link>
                <BlunderSeverityBadge winDrop={b.winDrop} />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {plyLabel(b.ply)} {b.moveSan}: {formatEval(b.evalBefore)} →{' '}
                  {formatEval(b.evalAfter)} ({formatSwing(b)})
                </span>
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-500">{b.moveDescription}</div>
              {b.reason && (
                <div className="text-xs text-zinc-500 dark:text-zinc-500">
                  {describeBlunderReason(b.reason)}
                </div>
              )}
              {b.betterMove && (
                <div className="text-xs text-zinc-500 dark:text-zinc-500">
                  {s.common.betterWas} {b.betterMove}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <EvalHelp />
    </div>
  )
}
