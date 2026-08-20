'use client'

import { useState } from 'react'
import { formatEval } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { useBoardContext, useLiveAnalysisContext } from './Board'
import { MoveSequence } from './MoveSequence'

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
  const {
    exploring,
    explorePath,
    explorePly,
    explorePositions,
    playExploreLine,
    resetExploreLine,
    setExplorePly,
  } = useBoardContext()
  const s = getStrings()

  // Which line (by index into the *current* `lines` array) was just sent to
  // `playExploreLine()` — highlighted so pressing ▶ has an obvious, immediate
  // effect right where the click happened, not just the "your line" strip
  // below (which stays put; see its own comment) being the only sign
  // anything happened. Cleared as soon as `fen` moves on to a new position —
  // at that point `lines` itself is about to be replaced anyway, so the
  // highlight wouldn't mean anything relative to the new list even if left
  // on. Reset during render (React's documented "adjust state when a prop
  // changes" pattern, same one `BoardView`'s `isAdjacentStep` uses) rather
  // than an effect — this needs to happen before the stale-line paint, not
  // after it.
  const [queuedIndex, setQueuedIndex] = useState<number | null>(null)
  const [prevFen, setPrevFen] = useState(fen)
  if (fen !== prevFen) {
    setPrevFen(fen)
    setQueuedIndex(null)
  }

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
      {exploring && explorePath.length > 0 && (
        // Pinned above the candidate lines rather than tucked below the
        // board — this is the answer to "which line am I following, and
        // where in it am I right now" once the lines below have already
        // moved on to a different position's search (which they do the
        // moment you step forward/back), so it needs its own stable spot,
        // not to blend into whatever's currently showing. Tied to
        // `explorePath` itself, not to a search result — the only things
        // that clear it are exiting exploration or making a manual move that
        // overwrites this branch, not the lines list refreshing around it.
        // `currentIndex`/`onSelectIndex` highlight the move that got you to
        // `explorePly` and let a click jump straight to any other point in
        // the same branch — the same explore-path-aware ◀/▶ nav in
        // `BoardNavControls` does, just from here too.
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-b border-zinc-800 px-3 py-2 text-xs">
          <span className="shrink-0 font-semibold text-zinc-500">{s.liveAnalysis.yourLine}</span>
          <MoveSequence
            fen={explorePositions[0]}
            moves={explorePath}
            currentIndex={explorePly - 1}
            onSelectIndex={(i) => setExplorePly(i + 1)}
          />
          {/* The ◀/⏮ nav only moves the *pointer* back through this same
              line, leaving it in place to walk into again — this is the
              "actually get rid of it" action, back to a clean branch at the
              position exploring started from, still exploring. */}
          <button
            onClick={resetExploreLine}
            aria-label={s.liveAnalysis.resetLine}
            title={s.liveAnalysis.resetLine}
            className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex flex-col divide-y divide-zinc-800">
        {lines === null || fen === null ? (
          <p className="px-3 pb-3 text-zinc-500">{s.liveAnalysis.thinking}</p>
        ) : (
          lines.map((line, i) => {
            const moves = [line.move.san, ...line.move.bestLine]
            const isQueued = i === queuedIndex
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2 ${isQueued ? 'bg-accent/10' : ''}`}
              >
                <span className="w-12 shrink-0 font-mono text-zinc-200 tabular-nums">
                  {formatEval({ cp: line.cp, mate: line.mate, bestMove: null })}
                </span>
                <MoveSequence fen={fen} moves={moves} />
                {/* Plays the whole line onto the board at once (starting
                    exploring first if not already), rather than making the
                    user manually replay it move by move — which, before this
                    existed, lost its own reference partway through: each
                    manual move re-searches and replaces the very line being
                    followed. Disabled while `thinking` — see that field's
                    comment — a stale line played from the wrong position
                    would corrupt the explore branch rather than just show a
                    stale number. Swaps to a checkmark once queued, both as
                    feedback that the click landed and so it doesn't look
                    like it's still offering to be pressed again — only when
                    `playExploreLine()` actually reports success, so a line
                    that turned out stale after all (see its own comment)
                    doesn't claim to be queued when nothing happened. */}
                <button
                  onClick={() => {
                    if (playExploreLine(moves)) setQueuedIndex(i)
                  }}
                  disabled={thinking || isQueued}
                  aria-label={isQueued ? s.liveAnalysis.lineQueued : s.liveAnalysis.playLine}
                  title={isQueued ? s.liveAnalysis.lineQueued : s.liveAnalysis.playLine}
                  className={`shrink-0 rounded px-1.5 py-0.5 disabled:opacity-100 ${
                    isQueued
                      ? 'text-emerald-400'
                      : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30'
                  }`}
                >
                  {isQueued ? '✓' : '▶'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
