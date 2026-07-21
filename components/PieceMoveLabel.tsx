import { splitSanPiece } from '@/lib/san'
import { PieceGlyph } from './PieceGlyph'

export function PieceMoveLabel({ san }: { san: string }) {
  const { piece, rest } = splitSanPiece(san)
  if (!piece) return san

  return (
    <span className="inline-flex items-center gap-1">
      <PieceGlyph piece={piece} className="h-4 w-4 shrink-0" />
      {rest}
    </span>
  )
}
