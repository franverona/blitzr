import { getStrings } from '@/lib/i18n/strings'
import type { MyResult } from '@/lib/types'
import { Badge } from './Badge'
import type { Tone } from './styles'

const RESULT_TONES: Record<MyResult, Tone> = {
  win: 'emerald',
  draw: 'zinc',
  loss: 'rose',
}

const RESULT_BADGE_GLYPHS: Record<MyResult, string> = {
  win: '▲',
  draw: '●',
  loss: '▼',
}

export function ResultBadge({ result, className = '' }: { result: MyResult; className?: string }) {
  return (
    <Badge tone={RESULT_TONES[result]} className={className}>
      <span aria-hidden="true">{RESULT_BADGE_GLYPHS[result]}</span>
      {getStrings().common.result[result]}
    </Badge>
  )
}
