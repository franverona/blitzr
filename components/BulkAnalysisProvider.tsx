'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { getUnanalyzedGames, saveGameAnalysis } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { ANALYSIS_STRENGTHS, analyzeGames } from '@/lib/stockfish/analyze'
import type { BulkAnalysisProgress } from '@/lib/stockfish/analyze'
import { useSettings } from './SettingsProvider'

interface BulkAnalysisContextValue {
  progress: BulkAnalysisProgress | null
  start: () => void
  cancel: () => void
}

// One toast at a time: a new run's replaces the last one's.
const TOAST_ID = 'bulk-analysis'

const BulkAnalysisContext = createContext<BulkAnalysisContextValue | null>(null)

// Mounted in the root layout so a run survives navigation.
export function BulkAnalysisProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<BulkAnalysisProgress | null>(null)
  const { analysisStrength } = useSettings()
  // A ref so cancel() is visible to the long-running analyzeGames() closure.
  const shouldContinueRef = useRef(true)
  // Guards against a double click starting two runs before `progress` is set.
  const runningRef = useRef(false)
  const s = getStrings()

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
    toast.dismiss(TOAST_ID)
    shouldContinueRef.current = true

    try {
      const games = await getUnanalyzedGames()
      if (games.length === 0) {
        toast(s.bulkAnalyze.nothingToAnalyze, { id: TOAST_ID })
        return
      }

      setProgress({ gamesDone: 0, gamesTotal: games.length, positionsDone: 0, positionsTotal: 0 })
      let analyzed = 0
      let failed = 0
      const movetimeMs = ANALYSIS_STRENGTHS[analysisStrength]
      await analyzeGames(
        games,
        // A failed save skips that game rather than ending the run.
        async (gameId, evals) => {
          try {
            const result = await saveGameAnalysis(gameId, evals, movetimeMs)
            if (result.ok) analyzed++
            else failed++
          } catch (err) {
            console.error(err)
            failed++
          }
        },
        setProgress,
        () => shouldContinueRef.current,
        movetimeMs,
      )

      if (failed > 0) {
        toast.error(s.bulkAnalyze.someFailed(analyzed, failed, games.length), { id: TOAST_ID })
      } else {
        toast(s.bulkAnalyze.analyzed(analyzed, games.length), { id: TOAST_ID })
      }
    } catch (err) {
      // The engine's messages are English-only.
      console.error(err)
      toast.error(s.bulkAnalyze.analysisFailed, { id: TOAST_ID })
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
    </BulkAnalysisContext.Provider>
  )
}

export function useBulkAnalysis(): BulkAnalysisContextValue {
  const ctx = useContext(BulkAnalysisContext)
  if (!ctx) throw new Error('Must be used within <BulkAnalysisProvider>')
  return ctx
}
