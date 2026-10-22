'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { StockfishEngine } from '@/lib/stockfish/client'
import type { EngineLine } from '@/lib/types'
import { useSettings } from './SettingsProvider'
import { useBoardContext } from './BoardContext'

interface LiveAnalysisContextValue {
  /** null until the first search completes. */
  lines: EngineLine[] | null
  /** The position `lines` was computed for. Searches lag `displayFen`, so
   *  anything drawn on the board must check this against `displayFen`. */
  fen: string | null
  /** A search is running or queued. */
  thinking: boolean
}

const LiveAnalysisContext = createContext<LiveAnalysisContextValue | null>(null)

// Same value a provider exposes before its first result.
const NO_LIVE_ANALYSIS: LiveAnalysisContextValue = {
  lines: null,
  fen: null,
  thinking: false,
}

/** Doesn't throw without a provider: `/learn` renders `BoardView` without one
 *  to avoid spinning up an engine Worker for a hand-authored line. */
export function useLiveAnalysisContext(): LiveAnalysisContextValue {
  return useContext(LiveAnalysisContext) ?? NO_LIVE_ANALYSIS
}

// Re-searches on every step, so it trades depth for responsiveness.
const LIVE_MULTI_PV = 3
const LIVE_MOVETIME_MS = 600

/**
 * Owns the live MultiPV search shared by `LiveAnalysisPanel` and `BoardView`.
 * Separate from LiveAnalysisPanel.tsx so BoardView reads it without importing the panel.
 */
export function LiveAnalysisProvider({ children }: { children: React.ReactNode }) {
  const { displayFen, exploring } = useBoardContext()
  const { hideEngineHints } = useSettings()
  // Hidden hints hide the arrow, eval bar and `LiveAnalysisPanel`, except
  // while exploring, where the panel stays.
  const active = !hideEngineHints || exploring
  const [state, setState] = useState<LiveAnalysisContextValue>({
    lines: null,
    fen: null,
    thinking: active,
  })

  // Engine and request queue are created in the same effect so a Strict Mode
  // remount can't leave a drain loop awaiting a terminated Worker.
  const requestRef = useRef<(fen: string) => void>(() => {})

  useEffect(() => {
    const engine = new StockfishEngine()
    let cancelled = false
    // ponytail: at most one search in flight; only the latest requested FEN
    // runs next, intermediate positions are dropped.
    let pendingFen: string | null = null
    let busy = false

    async function drain() {
      busy = true
      try {
        while (pendingFen && !cancelled) {
          const fen = pendingFen
          pendingFen = null
          const lines = await engine.evaluateLines(fen, LIVE_MULTI_PV, LIVE_MOVETIME_MS)
          // Skip a result that a newer request has already superseded.
          if (!cancelled && !pendingFen) setState({ lines, fen, thinking: false })
        }
      } catch {
        // Worker died — clear the spinner.
        pendingFen = null
        if (!cancelled) setState((prev) => ({ ...prev, thinking: false }))
      } finally {
        busy = false
      }
    }

    requestRef.current = (fen) => {
      pendingFen = fen
      setState((prev) => ({ ...prev, thinking: true }))
      if (!busy) drain()
    }

    return () => {
      cancelled = true
      engine.terminate()
    }
  }, [])

  useEffect(() => {
    if (active) requestRef.current(displayFen)
  }, [displayFen, active])

  return <LiveAnalysisContext.Provider value={state}>{children}</LiveAnalysisContext.Provider>
}
