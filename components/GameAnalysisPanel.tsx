'use client'

import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { saveGameAnalysis } from '@/app/actions'
import { biggestBlunder, blunderSeverity, findBlunders } from '@/lib/analysis'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { MOVE_QUALITY_TIERS, summarizeMoveQuality } from '@/lib/moveQuality'
import { buildPositions } from '@/lib/positions'
import { describeMove, plyLabel } from '@/lib/san'
import { ANALYSIS_STRENGTHS, type AnalysisStrength, analyzeGame } from '@/lib/stockfish/analyze'
import { describeBlunderReason, detectBlunderReason } from '@/lib/tactics'
import type { GameAnalysis, MyColor } from '@/lib/types'
import { useBoardContext } from './Board'
import { Select } from './Select'
import { useSettings } from './SettingsProvider'

interface AnalysisContextValue {
  analysis: GameAnalysis | null
  progress: { done: number; total: number } | null
  error: string | null
  handleAnalyze: (strength: AnalysisStrength) => void
  movesSan: string[]
  myColor: MyColor
  /** FEN before each ply. */
  positions: string[]
}

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

  async function handleAnalyze(strength: AnalysisStrength) {
    setError(null)
    setProgress({ done: 0, total: movesSan.length + 1 })
    try {
      const movetimeMs = ANALYSIS_STRENGTHS[strength]
      const evals = await analyzeGame(
        initialFen,
        movesSan,
        (done, total) => setProgress({ done, total }),
        movetimeMs,
      )
      setAnalysis({ gameId, evals, analyzedAt: new Date().toISOString(), movetimeMs })
      await saveGameAnalysis(gameId, evals, movetimeMs)
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

/** The strength picker defaults to the saved analysis's strength, else the
 *  Settings value; changing it here doesn't change the setting. */
export function AnalyzeButton() {
  const { analysis, progress, error, handleAnalyze } = useAnalysisContext()
  const { analysisStrength } = useSettings()
  const s = getStrings()
  const savedStrength = (Object.keys(ANALYSIS_STRENGTHS) as AnalysisStrength[]).find(
    (k) => ANALYSIS_STRENGTHS[k] === analysis?.movetimeMs,
  )
  const [strength, setStrength] = useState<AnalysisStrength>(savedStrength ?? analysisStrength)

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-stretch divide-x divide-zinc-300 rounded-md border border-zinc-300 text-sm dark:divide-zinc-700 dark:border-zinc-700">
        <Select
          value={strength}
          onChange={(e) => setStrength(e.target.value as AnalysisStrength)}
          disabled={progress !== null}
          aria-label={s.settings.analysisStrength}
          title={s.settings.analysisStrengthHint}
          className="rounded-l-md bg-transparent py-1.5 pl-3 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {(Object.keys(ANALYSIS_STRENGTHS) as AnalysisStrength[]).map((k) => (
            <option key={k} value={k} className="bg-zinc-50 dark:bg-zinc-900">
              {s.settings.analysisStrengths[k]}
              {k === savedStrength && ' ✓'}
            </option>
          ))}
        </Select>
        <button
          onClick={() => handleAnalyze(strength)}
          disabled={progress !== null}
          title={
            savedStrength &&
            s.analysisPanel.savedAtStrength(s.settings.analysisStrengths[savedStrength])
          }
          className="rounded-r-md px-3 py-1.5 font-medium whitespace-nowrap hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
        >
          {progress
            ? `${analysis ? s.analysisPanel.reanalyzing : s.analysisPanel.analyzing}… (${progress.done}/${progress.total})`
            : analysis
              ? s.analysisPanel.reanalyze
              : s.analysisPanel.analyzeWithStockfish}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}

/** One-line recap of the user's own biggest blunder. Renders nothing until
 *  the game is analyzed. */
export function GameSummary() {
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  const { setPly } = useBoardContext()
  const s = getStrings()
  if (!analysis) return null

  const myBlunders = findBlunders(analysis.evals, movesSan, positions[0]).filter(
    (b) => whiteToMove(b.ply, positions[0]) === (myColor === 'white'),
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
  const isBlunder = blunderSeverity(worst.winDrop) === 'blunder'
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

export function accuracyPillClass(accuracy: number): string {
  if (accuracy >= 90)
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
  if (accuracy >= 70) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
  return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
}

export function MoveQualityLink() {
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const s = getStrings()
  if (!analysis) return null

  const summary = summarizeMoveQuality(analysis.evals, movesSan, positions[0])
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
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  const s = getStrings()
  if (!analysis) return null

  const summary = summarizeMoveQuality(analysis.evals, movesSan, positions[0])
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
