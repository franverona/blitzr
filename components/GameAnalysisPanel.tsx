'use client'

import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { saveGameAnalysis } from '@/app/actions'
import {
  biggestBlunder,
  blunderSeverity,
  describeEval,
  findBlunders,
  formatEval,
  formatSwing,
} from '@/lib/analysis'
import { whiteToMove } from '@/lib/drill'
import { buildPositions } from '@/lib/positions'
import { describeMove, plyLabel } from '@/lib/san'
import { analyzeGame } from '@/lib/stockfish/analyze'
import { describeBetterMove, describeBlunderReason, detectBlunderReason } from '@/lib/tactics'
import type { GameAnalysis, MyColor } from '@/lib/types'
import { BlunderSeverityBadge } from './BlunderSeverityBadge'
import { EvalHelp } from './EvalHelp'

interface AnalysisContextValue {
  analysis: GameAnalysis | null
  progress: { done: number; total: number } | null
  error: string | null
  handleAnalyze: () => void
  movesSan: string[]
  myColor: MyColor
  /** FEN before each ply, same indexing as `movesSan`/`analysis.evals` — computed
   *  once here rather than by every consumer that needs to describe a move. */
  positions: string[]
}

// The button and its results dialog both live in the same corner of the
// page but are still two separate components (button + <dialog>) — a
// Context keeps them both talking to the one piece of client state without
// prop-drilling between them.
const AnalysisContext = createContext<AnalysisContextValue | null>(null)

function useAnalysisContext(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext)
  if (!ctx) throw new Error('Must be used within <GameAnalysisProvider>')
  return ctx
}

export function GameAnalysisProvider({
  gameId,
  initialFen,
  movesSan,
  myColor,
  initialAnalysis,
  children,
}: {
  gameId: string
  initialFen: string
  movesSan: string[]
  myColor: MyColor
  initialAnalysis: GameAnalysis | null
  children: React.ReactNode
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const positions = useMemo(() => buildPositions(initialFen, movesSan), [initialFen, movesSan])

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

  return (
    <AnalysisContext.Provider
      value={{ analysis, progress, error, handleAnalyze, movesSan, myColor, positions }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function AnalyzeButton() {
  const { analysis, progress, error, handleAnalyze } = useAnalysisContext()
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {analysis && (
          <button
            onClick={() => dialogRef.current?.showModal()}
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            View analysis
          </button>
        )}
        <button
          onClick={handleAnalyze}
          disabled={progress !== null}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-zinc-800 disabled:opacity-50"
        >
          {progress
            ? `${analysis ? 'Re-analyzing' : 'Analyzing'}… (${progress.done}/${progress.total})`
            : analysis
              ? 'Re-analyze'
              : 'Analyze with Stockfish'}
        </button>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <AnalysisDialog dialogRef={dialogRef} />
    </div>
  )
}

/** A one-line plain-language recap of the game — the single biggest blunder,
 *  whose it was, and what it was in plain English via `describeMove()`.
 *  Renders nothing until the game has a saved analysis, same "quietly do
 *  nothing when not applicable yet" pattern as `RepertoireDiff`. */
export function GameSummary() {
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  if (!analysis) return null

  const worst = biggestBlunder(findBlunders(analysis.evals, movesSan))
  if (!worst) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Clean game — no significant blunders from either side.
      </p>
    )
  }

  const isMine = whiteToMove(worst.ply) === (myColor === 'white')
  const moverColor = whiteToMove(worst.ply) ? 'white' : 'black'
  const reason = detectBlunderReason(positions[worst.ply - 1], positions[worst.ply], moverColor)
  const verb = blunderSeverity(worst.swingCp) === 'blunder' ? 'blundered' : 'made a mistake'
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      Biggest moment: {isMine ? 'you' : 'your opponent'} {verb} on {plyLabel(worst.ply)}{' '}
      {worst.moveSan} ({describeMove(positions[worst.ply - 1], worst.moveSan)}).{' '}
      {reason && describeBlunderReason(reason)}
    </p>
  )
}

function AnalysisDialog({ dialogRef }: { dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const { analysis, movesSan, positions } = useAnalysisContext()
  if (!analysis) return null

  const blunders = findBlunders(analysis.evals, movesSan)
  const worst = biggestBlunder(blunders)

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogRef.current?.close()
      }}
      className="fixed top-1/2 left-1/2 m-0 max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-700 bg-zinc-900 p-0 text-left text-zinc-100 backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Stockfish analysis</h2>
          <button
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

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
            <ul className="flex flex-col gap-1.5 text-sm text-zinc-400">
              {blunders.map((b) => {
                const moverColor = whiteToMove(b.ply) ? 'white' : 'black'
                const reason = detectBlunderReason(
                  positions[b.ply - 1],
                  positions[b.ply],
                  moverColor,
                )
                const betterMove = describeBetterMove(
                  positions[b.ply - 1],
                  b.moveSan,
                  b.evalBefore.bestMove,
                  moverColor,
                )
                return (
                  <li key={b.ply}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <BlunderSeverityBadge swingCp={b.swingCp} />
                      <span>
                        {plyLabel(b.ply)} {b.moveSan}: {formatEval(b.evalBefore)} →{' '}
                        {formatEval(b.evalAfter)} ({formatSwing(b)})
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {describeMove(positions[b.ply - 1], b.moveSan)}
                    </div>
                    {reason && (
                      <div className="text-xs text-zinc-500">{describeBlunderReason(reason)}</div>
                    )}
                    {betterMove && (
                      <div className="text-xs text-zinc-500">Better was {betterMove}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <EvalHelp />
      </div>
    </dialog>
  )
}
