'use client'

import { useRef, useState } from 'react'
import { evalBarPercent, formatEval } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { plyLabel } from '@/lib/san'
import type { PositionEval } from '@/lib/types'

const WIDTH = 400
const HEIGHT = 120

function xFor(index: number, count: number): number {
  return count <= 1 ? WIDTH / 2 : (index / (count - 1)) * WIDTH
}

function yFor(evaluation: PositionEval): number {
  return (1 - evalBarPercent(evaluation) / 100) * HEIGHT
}

/**
 * The eval bar over the whole game, first position to last: White's share fills from the bottom.
 * Fixed black/white like `EvalBar`, not theme-aware. Clicking a position jumps the board there.
 */
export function EvalGraph({
  evals,
  movesSan,
  initialFen,
  currentPly,
  onSelect,
}: {
  /** One per position; index 0 is the starting position. */
  evals: PositionEval[]
  movesSan: string[]
  initialFen: string
  /** Null while exploring off the recorded game. */
  currentPly: number | null
  onSelect: (ply: number) => void
}) {
  const s = getStrings()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverPly, setHoverPly] = useState<number | null>(null)
  const count = evals.length

  const linePath = evals
    .map((e, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i, count)} ${yFor(e)}`)
    .join(' ')
  const whiteArea = `${linePath} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`

  function plyAt(clientX: number): number {
    const rect = svgRef.current!.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))))
  }

  const hovered = hoverPly !== null ? evals[hoverPly] : null
  // shortcut: fixed 12–88% clamp keeps the tooltip on-chart; no collision math against its width.
  const hoverXPercent =
    hoverPly !== null ? Math.min(88, Math.max(12, (xFor(hoverPly, count) / WIDTH) * 100)) : 0

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">{s.analysisPanel.evalGraph}</p>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={s.analysisPanel.evalGraphLabel}
          className="h-28 w-full cursor-pointer overflow-hidden rounded bg-zinc-950"
          onMouseMove={(e) => setHoverPly(plyAt(e.clientX))}
          onMouseLeave={() => setHoverPly(null)}
          onClick={(e) => onSelect(plyAt(e.clientX))}
        >
          <path d={whiteArea} className="fill-zinc-100" />
          <line
            x1={0}
            x2={WIDTH}
            y1={HEIGHT / 2}
            y2={HEIGHT / 2}
            className="stroke-zinc-500"
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          {currentPly !== null && currentPly < count && (
            <line
              x1={xFor(currentPly, count)}
              x2={xFor(currentPly, count)}
              y1={0}
              y2={HEIGHT}
              className="stroke-accent"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {hoverPly !== null && (
            <line
              x1={xFor(hoverPly, count)}
              x2={xFor(hoverPly, count)}
              y1={0}
              y2={HEIGHT}
              className="stroke-zinc-400"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {hoverPly !== null && hovered && (
          <div
            className="pointer-events-none absolute -top-2 flex -translate-x-1/2 -translate-y-full flex-col rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs whitespace-nowrap shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{ left: `${hoverXPercent}%` }}
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {hoverPly === 0
                ? s.board.startingPositionButton
                : `${plyLabel(hoverPly, initialFen)} ${movesSan[hoverPly - 1]}`}
            </span>
            <span className="text-zinc-600 tabular-nums dark:text-zinc-400">
              {formatEval(hovered)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
