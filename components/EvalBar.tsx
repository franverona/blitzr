import { describeEval, evalBarPercent, formatEval } from '@/lib/analysis'
import type { PositionEval } from '@/lib/types'

export function EvalBar({
  evaluation,
  boardOrientation,
  className = '',
}: {
  evaluation: PositionEval
  boardOrientation: 'white' | 'black'
  className?: string
}) {
  const whitePercent = evalBarPercent(evaluation)
  // Anchor the white fill to White's side of the board.
  const justify = boardOrientation === 'white' ? 'justify-end' : 'justify-start'

  return (
    <div
      // Fixed black/white like chess.com's gauge, not theme-aware.
      className={`flex w-3 shrink-0 flex-col ${justify} overflow-hidden bg-zinc-950 ${className}`}
      title={`${describeEval(evaluation)} (${formatEval(evaluation)})`}
    >
      <div
        className="w-full bg-zinc-100 transition-[height]"
        style={{ height: `${whitePercent}%` }}
      />
    </div>
  )
}
