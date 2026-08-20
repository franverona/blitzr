'use client'

import { formatEval } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { formatMoveSequence } from '@/lib/san'
import { useLiveAnalysisContext } from './Board'
import { PieceMoveLabel } from './PieceMoveLabel'

/**
 * Chess.com-style "always-on" engine panel: shows the top candidate lines
 * for whatever position the board is currently showing — a recorded ply, or
 * a free-explored branch (see `ExploreToggleButton` in Board.tsx) — live,
 * re-searching every time that position changes. Distinct from
 * `GameAnalysisPanel`'s "Analyze" button, which does a one-shot, single-line,
 * *persisted* pass over the whole game for blunder-finding; this one is
 * ephemeral (nothing here is ever saved) and covers any position, not just
 * the ones actually played. The engine itself is owned by
 * `LiveAnalysisProvider` (Board.tsx) — this component is just the list.
 */
export function LiveAnalysisPanel() {
  const { lines, fen } = useLiveAnalysisContext()
  const s = getStrings()

  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 text-sm">
      <p className="px-3 pt-3 text-xs font-semibold text-zinc-500">{s.liveAnalysis.panelTitle}</p>
      <div className="flex flex-col divide-y divide-zinc-800">
        {lines === null || fen === null ? (
          <p className="px-3 pb-3 text-zinc-500">{s.liveAnalysis.thinking}</p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-2 px-3 py-2">
              <span className="w-12 shrink-0 font-mono text-zinc-200 tabular-nums">
                {formatEval({ cp: line.cp, mate: line.mate, bestMove: null })}
              </span>
              <EngineLineMoves fen={fen} moves={[line.move.san, ...line.move.bestLine]} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** Renders one engine line's moves chess.com-style: a piece icon (via
 *  `PieceMoveLabel`, colored per side — same look the game's own move list
 *  already uses) next to each non-pawn move, with a move-number label only
 *  before White's move (or once, as "N…", if the line opens with Black). */
function EngineLineMoves({ fen, moves }: { fen: string; moves: string[] }) {
  const formatted = formatMoveSequence(fen, moves)
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-zinc-400">
      {formatted.map((move, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {(move.color === 'white' || i === 0) && (
            <span className="text-zinc-600">
              {move.moveNumber}
              {move.color === 'white' ? '.' : '…'}
            </span>
          )}
          <PieceMoveLabel san={move.san} color={move.color} />
        </span>
      ))}
    </span>
  )
}
