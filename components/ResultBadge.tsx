import { getStrings } from '@/lib/i18n/strings'
import type { MyResult } from '@/lib/types'

const RESULT_BADGE_STYLES: Record<MyResult, string> = {
  win: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  draw: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-300',
  loss: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
}

const RESULT_BADGE_GLYPHS: Record<MyResult, string> = {
  win: '▲',
  draw: '●',
  loss: '▼',
}

export function ResultBadge({ result, className = '' }: { result: MyResult; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${RESULT_BADGE_STYLES[result]} ${className}`}
    >
      <span aria-hidden="true">{RESULT_BADGE_GLYPHS[result]}</span>
      {getStrings().common.result[result]}
    </span>
  )
}
