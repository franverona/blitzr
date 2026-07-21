'use client'

import { useState } from 'react'
import { saveGameAnalysis } from '@/app/actions'
import { biggestBlunder, findBlunders, formatEval } from '@/lib/analysis'
import { plyLabel } from '@/lib/san'
import { analyzeGame } from '@/lib/stockfish/analyze'
import type { GameAnalysis } from '@/lib/types'

export function GameAnalysisPanel({
  gameId,
  initialFen,
  movesSan,
  initialAnalysis,
}: {
  gameId: string
  initialFen: string
  movesSan: string[]
  initialAnalysis: GameAnalysis | null
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    setError(null)
    setProgress({ done: 0, total: movesSan.length + 1 })
    try {
      const evals = await analyzeGame(initialFen, movesSan, (done, total) =>
        setProgress({ done, total }),
      )
      setAnalysis({ gameId, evals, analyzedAt: new Date().toISOString() })
      await saveGameAnalysis(gameId, evals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setProgress(null)
    }
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          onClick={handleAnalyze}
          disabled={progress !== null}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
        >
          {progress ? `Analyzing… (${progress.done}/${progress.total})` : 'Analyze with Stockfish'}
        </button>
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    )
  }

  const blunders = findBlunders(analysis.evals, movesSan)
  const worst = biggestBlunder(blunders)

  return (
    <div className="flex flex-col items-start gap-2">
      {blunders.length === 0 ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          No blunders found by Stockfish — clean game.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {blunders.length} {blunders.length === 1 ? 'blunder' : 'blunders'} found. Biggest:{' '}
            {plyLabel(worst!.ply)} {worst!.moveSan} ({formatEval(worst!.evalBefore)} →{' '}
            {formatEval(worst!.evalAfter)}).
          </p>
          <ul className="flex flex-col gap-0.5 text-sm text-zinc-400">
            {blunders.map((b) => (
              <li key={b.ply}>
                {plyLabel(b.ply)} {b.moveSan}: {formatEval(b.evalBefore)} →{' '}
                {formatEval(b.evalAfter)} ({(b.swingCp / 100).toFixed(1)} pawns)
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={progress !== null}
        className="text-xs text-zinc-500 hover:text-zinc-300"
      >
        {progress ? `Re-analyzing… (${progress.done}/${progress.total})` : 'Re-analyze'}
      </button>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  )
}
