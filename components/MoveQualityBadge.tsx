import { getStrings } from '@/lib/i18n/strings'
import type { MoveQualityTier } from '@/lib/moveQuality'
import { Badge } from './Badge'
import type { Tone } from './styles'

export type BadMoveTier = Extract<MoveQualityTier, 'inaccuracy' | 'mistake' | 'blunder'>

const TIER_TONE: Record<BadMoveTier, Tone> = {
  inaccuracy: 'zinc',
  mistake: 'amber',
  blunder: 'rose',
}

export function MoveQualityBadge({ tier }: { tier: BadMoveTier }) {
  return (
    <Badge tone={TIER_TONE[tier]} shape="tag">
      {getStrings().analysisPanel.moveQuality[tier]}
    </Badge>
  )
}
