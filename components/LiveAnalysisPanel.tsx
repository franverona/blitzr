'use client'

import { useEffect, useRef, useState } from 'react'
import { formatEval } from '@/lib/analysis'
import { getStrings } from '@/lib/i18n/strings'
import { StockfishEngine } from '@/lib/stockfish/client'
import type { EngineLine } from '@/lib/types'
import { useBoardContext } from './Board'

// Fewer lines and a shorter search than the batch "Analyze" pass
// (`GameAnalysisPanel`) — this re-searches on every ply/explore step instead
// of once per game, so it needs to feel responsive rather than exhaustive.
const MULTI_PV = 3
const MOVETIME_MS = 600

/**
 * Chess.com-style "always-on" engine panel: shows the top `MULTI_PV`
 * candidate lines for whatever position the board is currently showing —
 * a recorded ply, or a free-explored branch (see `ExploreToggleButton` in
 * Board.tsx) — re-searching every time that position changes. Distinct from
 * `GameAnalysisPanel`'s "Analyze" button, which does a one-shot, single-line,
 * *persisted* pass over the whole game for blunder-finding; this one is
 * ephemeral (nothing here is ever saved) and covers any position, not just
 * the ones actually played.
 *
 * Owns one long-lived `StockfishEngine` (its own Worker) for as long as it's
 * mounted, unlike the batch pass's pool of engines that get torn down as
 * soon as that one run finishes.
 */
export function LiveAnalysisPanel() {
  const { displayFen } = useBoardContext()
  const s = getStrings()
  const [lines, setLines] = useState<EngineLine[] | null>(null)

  // Bridges the fen-change effect below into the engine-owning effect's own
  // request queue, rather than two effects independently reading/writing a
  // shared ref — a dev-only Strict Mode remount then can't leave a drain
  // loop `await`-ing a promise from an already-terminated engine instance
  // (that Worker never emits another message, so the loop would hang on
  // "Thinking…" forever instead of picking up the fresh instance). Each
  // mount of the effect below gets its own engine *and* its own closed-over
  // queue state, so there's nothing for an old and a new instance to share.
  const requestRef = useRef<(fen: string) => void>(() => {})

  useEffect(() => {
    const engine = new StockfishEngine()
    let cancelled = false
    // ponytail: never more than one search in flight — if the position
    // moves on again before the current search resolves, only the latest
    // requested FEN gets re-run once the engine is free, rather than
    // queuing every intermediate position or teaching StockfishEngine a
    // `stop` command just for this panel.
    let pendingFen: string | null = null
    let busy = false

    async function drain() {
      busy = true
      while (pendingFen && !cancelled) {
        const fen = pendingFen
        pendingFen = null
        const result = await engine.evaluateLines(fen, MULTI_PV, MOVETIME_MS)
        if (!cancelled && !pendingFen) setLines(result)
      }
      busy = false
    }

    requestRef.current = (fen) => {
      pendingFen = fen
      if (!busy) drain()
    }

    return () => {
      cancelled = true
      engine.terminate()
    }
  }, [])

  useEffect(() => {
    requestRef.current(displayFen)
  }, [displayFen])

  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 text-sm">
      <p className="px-3 pt-3 text-xs font-semibold text-zinc-500">{s.liveAnalysis.panelTitle}</p>
      <div className="flex flex-col divide-y divide-zinc-800">
        {lines === null ? (
          <p className="px-3 pb-3 text-zinc-500">{s.liveAnalysis.thinking}</p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-2 px-3 py-2">
              <span className="w-12 shrink-0 font-mono text-zinc-200 tabular-nums">
                {formatEval({ cp: line.cp, mate: line.mate, bestMove: null })}
              </span>
              <span className="min-w-0 truncate text-zinc-400">
                {[line.move.san, ...line.move.bestLine].join(' ')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
