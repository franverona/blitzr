'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getUnanalyzedGames, saveGameAnalysis } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { analyzeGames } from '@/lib/stockfish/analyze'
import type { BulkAnalysisProgress } from '@/lib/stockfish/analyze'

const TOAST_DURATION_MS = 4000

interface BulkAnalysisContextValue {
  progress: BulkAnalysisProgress | null
  start: () => void
  cancel: () => void
}

const BulkAnalysisContext = createContext<BulkAnalysisContextValue | null>(null)

// Mounted once in the root layout — not on the games page itself — so a run
// started from "Analyze all" keeps going, and stays visible via the nav
// indicator, across route changes instead of being cancelled the moment the
// user navigates away from the games list.
export function BulkAnalysisProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<BulkAnalysisProgress | null>(null)
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null)
  // A ref, not state — analyzeGames() reads this via a closure held for the
  // whole (potentially long) run, so cancel() needs to mutate a value that
  // closure can see immediately rather than one frozen at the render where
  // start() was called.
  const shouldContinueRef = useRef(true)
  const s = getStrings()

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [toast])

  async function start() {
    if (progress !== null) return
    setToast(null)
    shouldContinueRef.current = true

    try {
      const games = await getUnanalyzedGames()
      if (games.length === 0) {
        setToast({ text: s.bulkAnalyze.nothingToAnalyze, isError: false })
        return
      }

      setProgress({ gamesDone: 0, gamesTotal: games.length, positionsDone: 0, positionsTotal: 0 })
      let analyzed = 0
      await analyzeGames(
        games,
        async (gameId, evals) => {
          await saveGameAnalysis(gameId, evals)
          analyzed++
        },
        setProgress,
        () => shouldContinueRef.current,
      )

      setToast({ text: s.bulkAnalyze.analyzed(analyzed, games.length), isError: false })
    } catch (err) {
      setToast({
        text: err instanceof Error ? err.message : s.bulkAnalyze.analysisFailed,
        isError: true,
      })
    } finally {
      setProgress(null)
    }
  }

  function cancel() {
    shouldContinueRef.current = false
  }

  return (
    <BulkAnalysisContext.Provider value={{ progress, start, cancel }}>
      {children}
      {toast && (
        <div
          role="status"
          onClick={() => setToast(null)}
          className={`fixed right-4 bottom-4 z-50 max-w-sm cursor-pointer rounded-md border px-4 py-2.5 text-sm shadow-lg ${
            toast.isError
              ? 'border-rose-900 bg-rose-950 text-rose-200'
              : 'border-zinc-700 bg-zinc-900 text-zinc-100'
          }`}
        >
          {toast.text}
        </div>
      )}
    </BulkAnalysisContext.Provider>
  )
}

export function useBulkAnalysis(): BulkAnalysisContextValue {
  const ctx = useContext(BulkAnalysisContext)
  if (!ctx) throw new Error('Must be used within <BulkAnalysisProvider>')
  return ctx
}
