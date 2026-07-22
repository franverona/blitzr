import Link from 'next/link'
import { formatEval, formatSwing } from '@/lib/analysis'
import { plyLabel } from '@/lib/san'
import type { SanPiece } from '@/lib/san'
import { describeBlunderReason } from '@/lib/tactics'
import type { BlunderStats as BlunderStatsData } from '@/lib/types'
import { BlunderSeverityBadge } from './BlunderSeverityBadge'
import { EvalHelp } from './EvalHelp'
import { PieceGlyph } from './PieceGlyph'

const PIECE_KEYS: ReadonlySet<string> = new Set(['K', 'Q', 'R', 'B', 'N'])

export function BlunderStats({ stats }: { stats: BlunderStatsData }) {
  if (stats.analyzedGames === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No analyzed games yet — open a game and click &ldquo;Analyze with Stockfish&rdquo; to start
        building this up.
      </p>
    )
  }

  if (stats.totalBlunders === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No blunders found across your {stats.analyzedGames} analyzed{' '}
        {stats.analyzedGames === 1 ? 'game' : 'games'} — clean sheet so far.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          By opening
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left text-xs tracking-wide text-zinc-500 uppercase dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Opening</th>
                <th className="px-3 py-2">Blunders</th>
                <th className="px-3 py-2">
                  <abbr title="How many pawns worse the position got, on average, across these blunders">
                    Avg swing
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {stats.byOpening.map((group) => (
                <tr key={group.key}>
                  <td className="px-3 py-2 font-medium">{group.label}</td>
                  <td className="px-3 py-2">{group.count}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {group.avgSwingCp !== null
                      ? `${(group.avgSwingCp / 100).toFixed(1)} pawns`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          By piece
        </h2>
        <div className="flex flex-wrap gap-2">
          {stats.byPiece.map((group) => (
            <div
              key={group.key}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm dark:border-zinc-800"
            >
              {PIECE_KEYS.has(group.key) && (
                <span
                  className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm"
                  style={{ backgroundColor: '#769656' }}
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
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Worst blunders
        </h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {stats.worst.map((b) => (
            <li key={`${b.gameId}-${b.ply}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/games/${b.gameId}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {b.gameLabel}
                </Link>
                <BlunderSeverityBadge swingCp={b.swingCp} />
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
            </li>
          ))}
        </ul>
      </section>

      <EvalHelp />
    </div>
  )
}
