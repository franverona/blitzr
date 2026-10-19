import { getStrings } from '@/lib/i18n/strings'
import type { SanPiece } from '@/lib/san'
import { PieceGlyph } from './PieceGlyph'

export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

// All four: puzzles and engine moves can need underpromotion (e.g. cxb8=N#).
const PROMOTION_PIECES: { promotion: PromotionPiece; glyph: SanPiece }[] = [
  { promotion: 'q', glyph: 'Q' },
  { promotion: 'r', glyph: 'R' },
  { promotion: 'b', glyph: 'B' },
  { promotion: 'n', glyph: 'N' },
]

/** Overlay for a board wrapper with `relative`. */
export function PromotionPicker({
  color,
  onChoose,
}: {
  color: 'white' | 'black'
  onChoose: (promotion: PromotionPiece) => void
}) {
  const s = getStrings()
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-2 rounded-lg bg-zinc-50 p-4 shadow-xl dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {s.puzzles.choosePromotion}
        </p>
        <div className="flex gap-2">
          {PROMOTION_PIECES.map(({ promotion, glyph }) => (
            <button
              key={promotion}
              onClick={() => onChoose(promotion)}
              className="h-12 w-12 rounded border border-zinc-300 bg-white p-1 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <PieceGlyph piece={glyph} color={color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
