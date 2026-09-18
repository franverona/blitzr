'use client'

import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { saveGameAnalysis } from '@/app/actions'
import { biggestBlunder, blunderSeverity, findBlunders } from '@/lib/analysis'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { MOVE_QUALITY_TIERS, summarizeMoveQuality } from '@/lib/moveQuality'
import { buildPositions } from '@/lib/positions'
import { describeMove, plyLabel } from '@/lib/san'
import { analyzeGame } from '@/lib/stockfish/analyze'
import { describeBlunderReason, detectBlunderReason } from '@/lib/tactics'
import type { GameAnalysis, MyColor } from '@/lib/types'
import { useBoardContext } from './Board'

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
      setError(err instanceof Error ? err.message : getStrings().analysisPanel.analysisFailed)
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
  const s = getStrings()

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleAnalyze}
        disabled={progress !== null}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {progress
          ? `${analysis ? s.analysisPanel.reanalyzing : s.analysisPanel.analyzing}… (${progress.done}/${progress.total})`
          : analysis
            ? s.analysisPanel.reanalyze
            : s.analysisPanel.analyzeWithStockfish}
      </button>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}

/** A one-line plain-language recap of the game — the single biggest blunder,
 *  and what it was in plain English via `describeMove()`. Scoped to the
 *  account's own moves only (same convention as `buildBlunderStats()`,
 *  `lib/blunders.ts`) — an opponent's, coach's, or bot's blunder isn't a
 *  useful thing to review. Renders nothing until the game has a saved
 *  analysis, same "quietly do nothing when not applicable yet" pattern as
 *  `RepertoireDiff`. */
export function GameSummary() {
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  const { setPly } = useBoardContext()
  const s = getStrings()
  if (!analysis) return null

  const myBlunders = findBlunders(analysis.evals, movesSan).filter(
    (b) => whiteToMove(b.ply) === (myColor === 'white'),
  )
  const worst = biggestBlunder(myBlunders)
  if (!worst) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {s.analysisPanel.cleanGameNoBlunders}
      </p>
    )
  }

  const reason = detectBlunderReason(positions[worst.ply - 1], positions[worst.ply], myColor)
  const isBlunder = blunderSeverity(worst.swingCp) === 'blunder'
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      {s.analysisPanel.biggestMoment(isBlunder)}{' '}
      <button
        onClick={() => setPly(worst.ply)}
        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        {plyLabel(worst.ply)} {worst.moveSan}
      </button>{' '}
      ({describeMove(positions[worst.ply - 1], worst.moveSan)}).{' '}
      {reason && describeBlunderReason(reason)}
    </p>
  )
}

/** A link below the move list opening a small dialog with a Chess.com-style
 *  accuracy + move-quality tally, "You" vs "Opponent" (this app only ever
 *  has one user, so naming the columns by side rather than by username
 *  keeps it simple — see CLAUDE.md's "single-user" scope). Skips Chess.com's
 *  Brilliant/Great/Book/Miss tiers (need sacrifice/opening-book detection
 *  this app doesn't have) and its "Game Score" row (not a documented
 *  formula, not worth faking a number for). Renders nothing until the game
 *  has a saved analysis, same "quietly do nothing when not applicable yet"
 *  pattern as `GameSummary`/`RepertoireDiff`. A separate concern from the
 *  move list's inline blunder markers (`components/MoveList.tsx`) — this is
 *  an aggregate accuracy tally across every move, not a duplicate of it.
 *  Your own accuracy number sits next to the link itself
 *  (not just inside the dialog) so it's visible at a glance without a click —
 *  as a colored pill, same "badge, not bare text" convention as
 *  `BlunderSeverityBadge`, so a good/bad accuracy reads at a glance too. */
export function accuracyPillClass(accuracy: number): string {
  if (accuracy >= 90)
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
  if (accuracy >= 70) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
  return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
}

export function MoveQualityLink() {
  const { analysis, movesSan, myColor } = useAnalysisContext()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const s = getStrings()
  if (!analysis) return null

  const summary = summarizeMoveQuality(analysis.evals, movesSan)
  const mine = myColor === 'white' ? summary.white : summary.black

  return (
    <div className="flex items-center gap-2 self-start text-sm">
      <span className="text-zinc-500 dark:text-zinc-400">{s.analysisPanel.accuracy}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${accuracyPillClass(mine.accuracy)}`}
      >
        {mine.accuracy}
      </span>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {s.analysisPanel.moveQualityLink}
      </button>
      <MoveQualityDialog dialogRef={dialogRef} />
    </div>
  )
}

function MoveQualityDialog({
  dialogRef,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>
}) {
  const { analysis, movesSan, myColor } = useAnalysisContext()
  const s = getStrings()
  if (!analysis) return null

  const summary = summarizeMoveQuality(analysis.evals, movesSan)
  const mine = myColor === 'white' ? summary.white : summary.black
  const theirs = myColor === 'white' ? summary.black : summary.white

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogRef.current?.close()
      }}
      className="fixed top-1/2 left-1/2 m-0 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-0 text-left text-zinc-900 backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">{s.analysisPanel.moveQualityLink}</h2>
          <button
            onClick={() => dialogRef.current?.close()}
            aria-label={s.common.close}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left text-xs tracking-wide text-zinc-500 uppercase dark:bg-zinc-950">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2 text-right">{s.analysisPanel.you}</th>
                <th className="px-3 py-2 text-right">{s.analysisPanel.opponent}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr className="font-medium">
                <td className="px-3 py-2">{s.analysisPanel.accuracy}</td>
                <td className="px-3 py-2 text-right">{mine.accuracy}</td>
                <td className="px-3 py-2 text-right">{theirs.accuracy}</td>
              </tr>
              {MOVE_QUALITY_TIERS.map((tier) => (
                <tr key={tier} className="text-zinc-500 dark:text-zinc-400">
                  <td className="px-3 py-2">{s.analysisPanel.moveQuality[tier]}</td>
                  <td className="px-3 py-2 text-right">{mine.counts[tier]}</td>
                  <td className="px-3 py-2 text-right">{theirs.counts[tier]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </dialog>
  )
}
