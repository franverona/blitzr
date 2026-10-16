import { getStrings } from '@/lib/i18n/strings'
import { KnightGlyph } from './KnightGlyph'

// The badge background, not just the glyph tint, carries the color contrast.
export function KnightIcon({ color }: { color: 'white' | 'black' }) {
  const s = getStrings()
  const isWhite = color === 'white'
  return (
    <span
      role="img"
      aria-label={s.knightIcon.playingAs(s.common.color[color])}
      title={s.common.color[color]}
      className="inline-flex h-6 w-6 items-center justify-center rounded-sm p-1"
      style={
        isWhite
          ? { backgroundColor: '#fff', color: '#3a3a3a' }
          : { backgroundColor: '#3a3a3a', color: '#fff' }
      }
    >
      <KnightGlyph className="h-full w-full" />
    </span>
  )
}
