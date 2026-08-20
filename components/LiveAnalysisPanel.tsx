'use client'

import { formatEval } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { formatMoveSequence } from '@/lib/san'
import { useBoardContext, useLiveAnalysisContext } from './Board'
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
  const { lines, fen, thinking } = useLiveAnalysisContext()
  const { playExploreLine } = useBoardContext()
  const s = getStrings()

  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 text-sm">
      <div className="flex items-center justify-between px-3 pt-3">
        <p className="text-xs font-semibold text-zinc-500">{s.liveAnalysis.panelTitle}</p>
        {/* Small, quiet corner spinner rather than replacing the list every
            time a new search kicks off — stepping to a different move should
            still show the *previous* position's lines until the new ones are
            ready, with just this as the "still working on it" signal, not a
            flash back to an empty/loading panel on every navigation. */}
        {thinking && (
          <div
            role="status"
            aria-label={s.liveAnalysis.thinking}
            title={s.liveAnalysis.thinking}
            className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400"
          />
        )}
      </div>
      <div className="flex flex-col divide-y divide-zinc-800">
        {lines === null || fen === null ? (
          <p className="px-3 pb-3 text-zinc-500">{s.liveAnalysis.thinking}</p>
        ) : (
          lines.map((line, i) => {
            const moves = [line.move.san, ...line.move.bestLine]
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <span className="w-12 shrink-0 font-mono text-zinc-200 tabular-nums">
                  {formatEval({ cp: line.cp, mate: line.mate, bestMove: null })}
                </span>
                <EngineLineMoves fen={fen} moves={moves} />
                {/* Plays the whole line onto the board at once (starting
                    exploring first if not already), rather than making the
                    user manually replay it move by move — which, before this
                    existed, lost its own reference partway through: each
                    manual move re-searches and replaces the very line being
                    followed. Disabled while `thinking` — see that field's
                    comment — a stale line played from the wrong position
                    would corrupt the explore branch rather than just show a
                    stale number. */}
                <button
                  onClick={() => playExploreLine(moves)}
                  disabled={thinking}
                  aria-label={s.liveAnalysis.playLine}
                  title={s.liveAnalysis.playLine}
                  className="shrink-0 rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                >
                  ▶
                </button>
              </div>
            )
          })
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
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-zinc-400">
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
