'use client'

import { useState } from 'react'
import { formatEval } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { useBoardContext, useLiveAnalysisContext } from './Board'
import { MoveSequence } from './MoveSequence'
import { useSettings } from './SettingsProvider'
import { Spinner } from './Spinner'

/**
 * Live top-N engine lines for whatever the board shows (recorded ply or
 * explored branch). Ephemeral, unlike `GameAnalysisPanel`'s saved analysis.
 * The engine lives in `LiveAnalysisProvider`.
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
  const { hideEngineHints } = useSettings()
  const s = getStrings()

  // Highlights the line just played via ▶. Reset during render when `fen`
  // changes, since the new list won't correspond to it.
  const [queuedIndex, setQueuedIndex] = useState<number | null>(null)
  const [prevFen, setPrevFen] = useState(fen)
  if (fen !== prevFen) {
    setPrevFen(fen)
    setQueuedIndex(null)
  }

  // Exploring is an explicit ask for the engine, so it overrides hidden hints.
  if (hideEngineHints && !exploring) return null

  return (
    // Capped so a long explored line can't squeeze out the move list.
    <div className="flex shrink-0 flex-col gap-1 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 text-sm lg:max-h-[60%] dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between px-3 pt-3">
        <p className="text-xs font-semibold text-zinc-500">{s.liveAnalysis.panelTitle}</p>
        {/* Keeps showing the previous lines while a new search runs. */}
        {thinking && (
          <Spinner
            role="status"
            aria-label={s.liveAnalysis.thinking}
            title={s.liveAnalysis.thinking}
            className="size-3"
          />
        )}
      </div>
      {exploring && explorePath.length > 0 && (
        // Tied to `explorePath`, not to a search, so it stays put while the
        // lines below refresh.
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-b border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800">
          <span className="shrink-0 font-semibold text-zinc-500">{s.liveAnalysis.yourLine}</span>
          <MoveSequence
            fen={explorePositions[0]}
            moves={explorePath}
            currentIndex={explorePly - 1}
            onSelectIndex={(i) => setExplorePly(i + 1)}
          />
          <button
            onClick={resetExploreLine}
            aria-label={s.liveAnalysis.resetLine}
            title={s.liveAnalysis.resetLine}
            className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
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
                <span className="w-12 shrink-0 font-mono text-zinc-700 tabular-nums dark:text-zinc-200">
                  {formatEval({ cp: line.cp, mate: line.mate, bestMove: null })}
                </span>
                <MoveSequence fen={fen} moves={moves} />
                {/* Disabled while thinking: a stale line would corrupt the
                    branch. Shows ✓ only if `playExploreLine()` applied it. */}
                <button
                  onClick={() => {
                    if (playExploreLine(moves)) setQueuedIndex(i)
                  }}
                  disabled={thinking || isQueued}
                  aria-label={isQueued ? s.liveAnalysis.lineQueued : s.liveAnalysis.playLine}
                  title={isQueued ? s.liveAnalysis.lineQueued : s.liveAnalysis.playLine}
                  className={`shrink-0 rounded px-1.5 py-0.5 disabled:opacity-100 ${
                    isQueued
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
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
