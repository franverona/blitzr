'use client'

import { formatMoveSequence } from '@/lib/san'
import { PieceMoveLabel } from './PieceMoveLabel'

/**
 * SAN moves from any starting position, with piece icons and move numbers.
 * Its own file to avoid a circular import between Board.tsx and
 * LiveAnalysisPanel.tsx.
 */
export function MoveSequence({
  fen,
  moves,
  currentIndex,
  onSelectIndex,
}: {
  fen: string
  moves: string[]
  /** 0-indexed move to highlight. */
  currentIndex?: number
  /** Makes each move clickable; omitted, moves are plain text. */
  onSelectIndex?: (index: number) => void
}) {
  const formatted = formatMoveSequence(fen, moves)

  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1">
      {formatted.map((move, i) => {
        // zinc-500 matches MoveList's move numbers and stays readable in dark mode.
        const numberLabel = (move.color === 'white' || i === 0) && (
          <span className="text-zinc-500">
            {move.moveNumber}
            {move.color === 'white' ? '.' : '…'}
          </span>
        )
        const isCurrent = i === currentIndex

        if (!onSelectIndex) {
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 ${isCurrent ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              {numberLabel}
              <PieceMoveLabel san={move.san} color={move.color} />
            </span>
          )
        }
        return (
          <button
            key={i}
            onClick={() => onSelectIndex(i)}
            className={`inline-flex items-center gap-1 rounded px-1 py-0.5 ${
              isCurrent
                ? 'bg-accent/40 font-semibold text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {numberLabel}
            <PieceMoveLabel san={move.san} color={move.color} />
          </button>
        )
      })}
    </span>
  )
}
