import { blunderSeverity } from '@/lib/analysis'

const STYLES = {
  mistake: 'bg-amber-900/40 text-amber-400',
  blunder: 'bg-rose-900/40 text-rose-400',
} as const

export function BlunderSeverityBadge({ swingCp }: { swingCp: number }) {
  const severity = blunderSeverity(swingCp)
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${STYLES[severity]}`}
    >
      {severity}
    </span>
  )
}
