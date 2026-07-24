import { blunderSeverity } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'

const STYLES = {
  mistake: 'bg-amber-900/40 text-amber-400',
  blunder: 'bg-rose-900/40 text-rose-400',
} as const

export function BlunderSeverityBadge({ swingCp }: { swingCp: number }) {
  const s = getStrings()
  const severity = blunderSeverity(swingCp)
  return (
    <abbr
      title={s.blunderBadge.titles[severity]}
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase no-underline ${STYLES[severity]}`}
    >
      {s.blunderBadge.labels[severity]}
    </abbr>
  )
}
