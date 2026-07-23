import { blunderSeverity } from '@/lib/analysis'

const STYLES = {
  mistake: 'bg-amber-900/40 text-amber-400',
  blunder: 'bg-rose-900/40 text-rose-400',
} as const

// Same abbr-tooltip convention as the ECO code / "in book"/"deviated" terms
// on the game page — a beginner-facing definition on hover, without needing
// to open EvalHelp's collapsed glossary (which explains the same two terms
// at greater length) just to see what one badge means.
const TITLES = {
  mistake: 'A blunder of 2–4 pawns of swing — the smaller of the two severities',
  blunder: 'A blunder of 4+ pawns of swing — the more severe of the two severities',
} as const

export function BlunderSeverityBadge({ swingCp }: { swingCp: number }) {
  const severity = blunderSeverity(swingCp)
  return (
    <abbr
      title={TITLES[severity]}
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase no-underline ${STYLES[severity]}`}
    >
      {severity}
    </abbr>
  )
}
