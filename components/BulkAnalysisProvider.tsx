'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getUnanalyzedGames, saveGameAnalysis } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { ANALYSIS_STRENGTHS, analyzeGames } from '@/lib/stockfish/analyze'
import type { BulkAnalysisProgress } from '@/lib/stockfish/analyze'
import { useSettings } from './SettingsProvider'

const TOAST_DURATION_MS = 4000

interface BulkAnalysisContextValue {
  progress: BulkAnalysisProgress | null
  start: () => void
  cancel: () => void
}

const BulkAnalysisContext = createContext<BulkAnalysisContextValue | null>(null)

// Mounted in the root layout so a run survives navigation.
export function BulkAnalysisProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<BulkAnalysisProgress | null>(null)
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null)
  const { analysisStrength } = useSettings()
  // A ref so cancel() is visible to the long-running analyzeGames() closure.
  const shouldContinueRef = useRef(true)
  // Guards against a double click starting two runs before `progress` is set.
  const runningRef = useRef(false)
  const s = getStrings()

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [toast])

  // Closing or reloading the tab kills the engines mid-run. Browsers show
  // their own generic prompt; custom text is ignored.
  const running = progress !== null
  useEffect(() => {
    if (!running) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [running])

  async function start() {
    if (runningRef.current) return
    runningRef.current = true
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
      const movetimeMs = ANALYSIS_STRENGTHS[analysisStrength]
      await analyzeGames(
        games,
        async (gameId, evals) => {
          const result = await saveGameAnalysis(gameId, evals, movetimeMs)
          if (!result.ok) throw new Error(result.error)
          analyzed++
        },
        setProgress,
        () => shouldContinueRef.current,
        movetimeMs,
      )

      setToast({ text: s.bulkAnalyze.analyzed(analyzed, games.length), isError: false })
    } catch (err) {
      setToast({
        text: err instanceof Error ? err.message : s.bulkAnalyze.analysisFailed,
        isError: true,
      })
    } finally {
      runningRef.current = false
      setProgress(null)
    }
  }

  function cancel() {
    shouldContinueRef.current = false
  }

  return (
    <BulkAnalysisContext.Provider value={{ progress, start, cancel }}>
      {children}
      {toast &&
        createPortal(
          <div
            role="status"
            onClick={() => setToast(null)}
            className={`max-w-sm cursor-pointer rounded-md border px-4 py-2.5 text-sm shadow-lg ${
              toast.isError
                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
                : 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
            }`}
          >
            {toast.text}
          </div>,
          document.getElementById('toasts')!,
        )}
    </BulkAnalysisContext.Provider>
  )
}

export function useBulkAnalysis(): BulkAnalysisContextValue {
  const ctx = useContext(BulkAnalysisContext)
  if (!ctx) throw new Error('Must be used within <BulkAnalysisProvider>')
  return ctx
}
