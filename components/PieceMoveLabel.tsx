import { splitSanPiece } from '@/lib/san'
import { PieceGlyph } from './PieceGlyph'

// One outlined glyph for both sides, recolored to the text color so it reads on any background.
const OUTLINE =
  "h-4 w-4 shrink-0 [&_[fill='#000']]:fill-current [&_[fill='#fff']]:fill-none [&_[stroke='#000']]:stroke-current"

export function PieceMoveLabel({ san }: { san: string }) {
  const { piece, rest } = splitSanPiece(san)
  if (!piece) return san

  return (
    <span className="inline-flex items-center gap-0.5">
      <PieceGlyph piece={piece} color="white" className={OUTLINE} />
      {rest}
    </span>
  )
}
