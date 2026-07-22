'use client'

import { useEffect, useRef, useState } from 'react'
import { getUnanalyzedGames, saveGameAnalysis } from '@/app/actions'
import { analyzeGames } from '@/lib/stockfish/analyze'
import type { BulkAnalysisProgress } from '@/lib/stockfish/analyze'

const TOAST_DURATION_MS = 4000

export function BulkAnalyzeButton() {
  const [progress, setProgress] = useState<BulkAnalysisProgress | null>(null)
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null)

  // Flipped to false on Cancel, and in the unmount cleanup below — checked by
  // analyzeGames() between games so navigating away (or clicking Cancel)
  // stops the run without cutting off whichever game is already in flight.
  const shouldContinueRef = useRef(true)

  useEffect(() => {
    return () => {
      shouldContinueRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [toast])

  async function handleClick() {
    setToast(null)
    shouldContinueRef.current = true

    try {
      const games = await getUnanalyzedGames()
      if (games.length === 0) {
        setToast({ text: 'Nothing to analyze — every game already has one.', isError: false })
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

      setToast({
        text:
          analyzed === games.length
            ? `Analyzed ${analyzed} game${analyzed === 1 ? '' : 's'}.`
            : `Analyzed ${analyzed} of ${games.length} games — stopped early.`,
        isError: false,
      })
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : 'Analysis failed.', isError: true })
    } finally {
      setProgress(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={handleClick}
          disabled={progress !== null}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-zinc-800 disabled:opacity-50"
        >
          Analyze all
        </button>
        {progress && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>
              Analyzing game {progress.gamesDone + 1} of {progress.gamesTotal}
              {progress.positionsTotal > 0 &&
                ` (${progress.positionsDone}/${progress.positionsTotal} positions)`}
              …
            </span>
            <button
              onClick={() => {
                shouldContinueRef.current = false
              }}
              className="text-zinc-500 underline hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
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
    </>
  )
}
