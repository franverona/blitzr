import Link from 'next/link'
import { formatEval } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { plyLabel } from '@/lib/san'
import { WINNING_WIN_PCT } from '@/lib/thrownWins'
import type { ThrownWin } from '@/lib/types'
import { SectionLabel } from './Card'
import { LINK_CLASS } from './styles'

const LIST_SIZE = 10

/** Drawn or lost games that reached a winning position, each linking to its peak. */
export function ThrownWins({ wins, analyzedGames }: { wins: ThrownWin[]; analyzedGames: number }) {
  const s = getStrings()
  if (analyzedGames === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>
        <abbr title={s.thrownWins.tooltip(WINNING_WIN_PCT)}>{s.thrownWins.title}</abbr>
      </SectionLabel>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {s.thrownWins.summary(wins.length, analyzedGames)}
      </p>
      {wins.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {wins.slice(0, LIST_SIZE).map((w) => (
            <li key={w.gameId} className="flex flex-wrap items-center gap-1.5">
              <Link href={`/games/${w.gameId}?ply=${w.peakPly}`} className={LINK_CLASS}>
                {w.gameLabel}
              </Link>
              <span className="text-zinc-600 dark:text-zinc-400">
                {s.thrownWins.peak(
                  formatEval(w.peakEval),
                  w.moveSan ? `${plyLabel(w.peakPly, w.initialFen)} ${w.moveSan}` : null,
                )}{' '}
                · {s.thrownWins.result[w.result]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
