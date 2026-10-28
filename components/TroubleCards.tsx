import Link from 'next/link'
import { getStrings } from '@/lib/i18n/strings'
import { plyLabel } from '@/lib/san'
import type { DrillPrompt } from '@/lib/types'
import { SectionLabel } from './Card'
import { MiniBoard } from './MiniBoard'
import { LINK_CLASS } from './styles'

/** The cards missed again and again, as positions to study; no answers, so they still drill. */
export function TroubleCards({ troubles }: { troubles: DrillPrompt[] }) {
  const s = getStrings()
  if (troubles.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>
        <abbr title={s.troubleCards.tooltip}>{s.troubleCards.title}</abbr>
      </SectionLabel>
      <ul className="flex flex-wrap gap-4">
        {troubles.map((t) => (
          <li key={`${t.gameId}:${t.sourceType}:${t.ply}`} className="flex w-36 flex-col gap-1">
            <Link href={`/games/${t.gameId}?ply=${t.ply - 1}`}>
              <MiniBoard fen={t.fen} boardOrientation={t.color} />
            </Link>
            <Link
              href={`/games/${t.gameId}?ply=${t.ply - 1}`}
              className={`truncate text-xs ${LINK_CLASS}`}
            >
              {t.gameLabel}
            </Link>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {/* `fen` is the position before the move, so it numbers ply 1 from there. */}
              {s.troubleCards.kind[t.sourceType]} · {plyLabel(1, t.fen)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
