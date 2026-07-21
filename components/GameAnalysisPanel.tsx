'use client'

import { useState } from 'react'
import { saveGameAnalysis } from '@/app/actions'
import { biggestBlunder, describeEval, findBlunders, formatEval, formatSwing } from '@/lib/analysis'
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
            {formatEval(worst!.evalAfter)}, {describeEval(worst!.evalAfter).toLowerCase()}).
          </p>
          <ul className="flex flex-col gap-0.5 text-sm text-zinc-400">
            {blunders.map((b) => (
              <li key={b.ply}>
                {plyLabel(b.ply)} {b.moveSan}: {formatEval(b.evalBefore)} →{' '}
                {formatEval(b.evalAfter)} ({formatSwing(b)})
              </li>
            ))}
          </ul>
        </div>
      )}

      <EvalHelp />

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

function EvalHelp() {
  return (
    <details className="text-xs text-zinc-500">
      <summary className="cursor-pointer select-none hover:text-zinc-300">How to read this</summary>
      <div className="mt-1.5 flex max-w-md flex-col gap-1.5 border-l border-zinc-800 pl-3">
        <p>
          <span className="font-medium text-zinc-400">22… a6</span> — move 22, played by Black. A
          plain number (<span className="font-medium text-zinc-400">22.</span>) is White&rsquo;s
          move; the ellipsis (<span className="font-medium text-zinc-400">22…</span>) marks
          Black&rsquo;s reply to it.
        </p>
        <p>
          <span className="font-medium text-zinc-400">+1.4 / -0.8</span> — how far ahead White
          (positive) or Black (negative) is, in a &ldquo;pawns of advantage&rdquo; unit. It blends
          material and position into one number, so +1.4 doesn&rsquo;t mean a literal extra pawn —
          just an edge worth about that much.
        </p>
        <p>
          <span className="font-medium text-zinc-400">M7 / -M3</span> — a forced checkmate in that
          many moves, found no matter how the other side responds. Once mate is found, the pawn
          number stops applying entirely.
        </p>
        <p>
          <span className="font-medium text-zinc-400">Blunder</span> — a move that made the position
          at least 2 pawns worse than the best available move, for whoever just played it. This is
          relative to the best move, not to whether that side was already ahead or behind — a losing
          position can still get worse, and that still counts.
        </p>
      </div>
    </details>
  )
}
