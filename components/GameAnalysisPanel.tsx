'use client'

import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { saveGameAnalysis } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { MOVE_QUALITY_TIERS, summarizeMoveQuality } from '@/lib/moveQuality'
import { buildPositions } from '@/lib/positions'
import { ANALYSIS_STRENGTHS, type AnalysisStrength, analyzeGame } from '@/lib/stockfish/analyze'
import type { GameAnalysis, MyColor } from '@/lib/types'
import { Dialog } from './Dialog'
import { ErrorText } from './ErrorText'
import { Select } from './Select'
import { useSettings } from './SettingsProvider'
import { accuracyTone, LINK_CLASS, TONE_TEXT_CLASS } from './styles'
import { TableShell } from './TableShell'

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
      const result = await saveGameAnalysis(gameId, evals, movetimeMs)
      if (!result.ok) setError(result.error)
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
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}

/** Inline " · Accuracy 87" for the game header; opens the move-quality breakdown. */
export function MoveQualityLink() {
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const s = getStrings()
  if (!analysis) return null

  const summary = summarizeMoveQuality(analysis.evals, movesSan, positions[0])
  const mine = myColor === 'white' ? summary.white : summary.black

  return (
    <>
      {' · '}
      <button
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
        title={s.analysisPanel.moveQualityLink}
        className={`cursor-pointer ${LINK_CLASS}`}
      >
        {s.analysisPanel.accuracy}{' '}
        <span
          className={`font-semibold tabular-nums ${TONE_TEXT_CLASS[accuracyTone(mine.accuracy)]}`}
        >
          {mine.accuracy}
        </span>
      </button>
      <MoveQualityDialog dialogRef={dialogRef} />
    </>
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
    <Dialog
      ref={dialogRef}
      title={s.analysisPanel.moveQualityLink}
      titleClassName="text-base"
      className="w-[95vw] max-w-md overflow-y-auto"
      bodyClassName="gap-4 p-6"
    >
      <TableShell
        headClassName="bg-zinc-100 dark:bg-zinc-950"
        head={
          <>
            <th className="px-3 py-2"></th>
            <th className="px-3 py-2 text-right">{s.analysisPanel.you}</th>
            <th className="px-3 py-2 text-right">{s.analysisPanel.opponent}</th>
          </>
        }
      >
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
      </TableShell>
    </Dialog>
  )
}
