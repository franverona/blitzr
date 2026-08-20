'use client'

import { formatMoveSequence } from '@/lib/san'
import { PieceMoveLabel } from './PieceMoveLabel'

/**
 * Renders a sequence of SAN moves from an arbitrary starting position,
 * chess.com-style: a piece icon (via `PieceMoveLabel`, colored per side —
 * same look the game's own move list already uses) next to each non-pawn
 * move, with a move-number label only before White's move (or once, as
 * "N…", if the sequence opens with Black).
 *
 * Shared by `LiveAnalysisPanel` (one engine line — no `currentIndex`, not
 * itself navigable) and `BoardView` (the explore branch's own played-so-far
 * line, `currentIndex` highlighting where the board actually is and
 * `onSelectIndex` letting a click jump straight there) rather than living in
 * either of those two files: Board.tsx and LiveAnalysisPanel.tsx already
 * import from each other in one direction (the panel needs
 * `useLiveAnalysisContext`/`useBoardContext` from Board.tsx), so this
 * couldn't live in either without a circular import.
 */
export function MoveSequence({
  fen,
  moves,
  currentIndex,
  onSelectIndex,
}: {
  fen: string
  moves: string[]
  /** 0-indexed move to highlight as "this is where the board is right now",
   *  if any. */
  currentIndex?: number
  /** Makes each move clickable, e.g. to jump the explore branch straight to
   *  that point in its own line — omitted (as for an engine line, which
   *  isn't itself a navigable position) leaves the moves as plain text. */
  onSelectIndex?: (index: number) => void
}) {
  const formatted = formatMoveSequence(fen, moves)

  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1">
      {formatted.map((move, i) => {
        const numberLabel = (move.color === 'white' || i === 0) && (
          <span className="text-zinc-600">
            {move.moveNumber}
            {move.color === 'white' ? '.' : '…'}
          </span>
        )
        const isCurrent = i === currentIndex

        if (!onSelectIndex) {
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 ${isCurrent ? 'font-semibold text-white' : 'text-zinc-400'}`}
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
                ? 'bg-accent/40 font-semibold text-white'
                : 'text-zinc-400 hover:bg-zinc-800'
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
