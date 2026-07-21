import { splitSanPiece, type SanPiece } from '@/lib/san'
import { KnightGlyph } from './KnightGlyph'

// Unicode glyphs render fine for these at small sizes — it's specifically the
// knight that tends to look muddy as a font glyph, which is why that one
// piece uses our own vector (KnightGlyph) instead.
const GLYPHS: Record<Exclude<SanPiece, 'N'>, string> = {
  K: '♚',
  Q: '♛',
  R: '♜',
  B: '♝',
}

export function PieceMoveLabel({ san }: { san: string }) {
  const { piece, rest } = splitSanPiece(san)
  if (!piece) return san

  return (
    <span className="inline-flex items-center gap-1">
      {piece === 'N' ? (
        <KnightGlyph className="h-3.5 w-3.5 shrink-0 opacity-70" />
      ) : (
        <span className="opacity-70">{GLYPHS[piece]}</span>
      )}
      {rest}
    </span>
  )
}
