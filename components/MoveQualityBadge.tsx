import { getStrings } from '@/lib/i18n/strings'
import type { MoveQualityTier } from '@/lib/moveQuality'
import { Badge } from './Badge'
import { toneClass, type Tone } from './styles'

export type BadMoveTier = Extract<MoveQualityTier, 'inaccuracy' | 'mistake' | 'blunder'>

const TIER_TONE: Record<BadMoveTier, Tone> = {
  inaccuracy: 'zinc',
  mistake: 'amber',
  blunder: 'rose',
}

// Standard annotation glyphs, as Lichess and Chess.com mark moves.
const TIER_GLYPH: Record<BadMoveTier, string> = {
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

/** `compact`: the glyph only (the move list), with the word as tooltip and screen-reader text. */
export function MoveQualityBadge({
  tier,
  compact = false,
}: {
  tier: BadMoveTier
  compact?: boolean
}) {
  const label = getStrings().analysisPanel.moveQuality[tier]
  if (compact) {
    return (
      <span
        title={label}
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs leading-none font-bold ${toneClass(TIER_TONE[tier])}`}
      >
        <span aria-hidden="true">{TIER_GLYPH[tier]}</span>
        <span className="sr-only">{label}</span>
      </span>
    )
  }
  return (
    <Badge tone={TIER_TONE[tier]} shape="tag">
      {label}
    </Badge>
  )
}
