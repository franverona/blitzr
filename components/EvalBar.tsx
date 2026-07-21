import { describeEval, evalBarPercent, formatEval } from '@/lib/analysis'
import type { PositionEval } from '@/lib/types'

export function EvalBar({
  evaluation,
  boardOrientation,
}: {
  evaluation: PositionEval
  boardOrientation: 'white' | 'black'
}) {
  const whitePercent = evalBarPercent(evaluation)
  // White's home rank renders at the bottom when the board isn't flipped, and
  // at the top when viewing as black — anchor the white fill to whichever
  // edge that is, so the bar agrees with which side of the board is White's.
  const justify = boardOrientation === 'white' ? 'justify-end' : 'justify-start'

  return (
    <div
      className={`flex w-3 shrink-0 flex-col ${justify} overflow-hidden bg-zinc-950`}
      title={`${describeEval(evaluation)} (${formatEval(evaluation)})`}
    >
      <div
        className="w-full bg-zinc-100 transition-[height]"
        style={{ height: `${whitePercent}%` }}
      />
    </div>
  )
}
