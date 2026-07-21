import { splitSanPiece } from '@/lib/san'
import { PieceGlyph } from './PieceGlyph'

export function PieceMoveLabel({ san, color }: { san: string; color: 'white' | 'black' }) {
  const { piece, rest } = splitSanPiece(san)
  if (!piece) return san

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-sm"
        style={{ backgroundColor: '#769656' }}
      >
        <PieceGlyph piece={piece} color={color} className="h-3.5 w-3.5" />
      </span>
      {rest}
    </span>
  )
}
