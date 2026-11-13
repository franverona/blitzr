'use client'

import { createContext, useContext, useEffect, useId, useMemo, useState } from 'react'
import { saveGameAnalysis } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { buildGameStory } from '@/lib/gameStory'
import type { GamePhase } from '@/lib/material'
import { MOVE_QUALITY_TIERS, summarizeMoveQuality } from '@/lib/moveQuality'
import { buildPositions } from '@/lib/positions'
import { moveNumberOfPly, plyLabel } from '@/lib/san'
import { ANALYSIS_STRENGTHS, type AnalysisStrength, analyzeGame } from '@/lib/stockfish/analyze'
import { describeBlunderReason } from '@/lib/tactics'
import type { GameAnalysis, MyColor, MyResult } from '@/lib/types'
import { useBoardContext } from './BoardContext'
import { Card } from './Card'
import type { BadMoveTier } from './MoveQualityBadge'
import { ErrorText } from './ErrorText'
import { EvalGraph } from './EvalGraph'
import { Select } from './Select'
import { useSettings } from './SettingsProvider'
import { accuracyTone, chipClass, LINK_CLASS, TONE_TEXT_CLASS } from './styles'
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
  // "Analyze all" can save this game while it's open; the revalidated page brings it as a new prop.
  const [prevInitialAnalysis, setPrevInitialAnalysis] = useState(initialAnalysis)
  if (initialAnalysis?.analyzedAt !== prevInitialAnalysis?.analyzedAt) {
    setPrevInitialAnalysis(initialAnalysis)
    if (initialAnalysis) setAnalysis(initialAnalysis)
  }
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
      // The engine's messages are English-only.
      console.error(err)
      setError(getStrings().analysisPanel.analysisFailed)
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

/** Inline " · Accuracy 87" for the game header; toggles the move-quality panel. */
export function MoveQualityLink() {
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const s = getStrings()
  if (!analysis) return null

  const summary = summarizeMoveQuality(analysis.evals, movesSan, positions[0])
  const mine = myColor === 'white' ? summary.white : summary.black

  return (
    <>
      {' · '}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        title={s.analysisPanel.moveQualityLink}
        className={`cursor-pointer ${LINK_CLASS}`}
      >
        {s.analysisPanel.accuracy}{' '}
        <span
          className={`font-semibold tabular-nums ${mine.accuracy === null ? '' : TONE_TEXT_CLASS[accuracyTone(mine.accuracy)]}`}
        >
          {mine.accuracy ?? '—'}
        </span>
      </button>
      <MoveQualityPanel id={panelId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

/** Always mounted so it can slide out too; `inert` keeps it out of the tab order while closed. */
function MoveQualityPanel({
  id,
  open,
  onClose,
}: {
  id: string
  open: boolean
  onClose: () => void
}) {
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  const { ply: currentPly, exploring, setPly, exitExploring } = useBoardContext()
  const titleId = useId()
  const s = getStrings()

  // Capture phase, so BoardNavControls' Esc (leave explore mode) never sees it.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!analysis) return null

  const summary = summarizeMoveQuality(analysis.evals, movesSan, positions[0], positions)
  const mine = myColor === 'white' ? summary.white : summary.black
  const theirs = myColor === 'white' ? summary.black : summary.white
  const badTiers = BAD_TIERS.filter((tier) => mine.plies[tier].length > 0)

  // The move itself, so the move list highlights it with its badge.
  function jumpTo(ply: number) {
    exitExploring()
    setPly(ply)
  }

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-zinc-950/20 transition-opacity duration-200 motion-reduce:transition-none dark:bg-black/40 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        id={id}
        aria-labelledby={titleId}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-md space-y-4 overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-900 shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-base font-semibold">
            {s.analysisPanel.moveQualityLink}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={s.common.close}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
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
            <td className="px-3 py-2 text-right">{mine.accuracy ?? '—'}</td>
            <td className="px-3 py-2 text-right">{theirs.accuracy ?? '—'}</td>
          </tr>
          {GAME_PHASES.map((phase) => (
            <tr key={phase} className="text-zinc-500 dark:text-zinc-400">
              <td className="py-2 pr-3 pl-6">{s.analysisPanel.phases[phase]}</td>
              <td className="px-3 py-2 text-right">{mine.byPhase?.[phase] ?? '—'}</td>
              <td className="px-3 py-2 text-right">{theirs.byPhase?.[phase] ?? '—'}</td>
            </tr>
          ))}
          {MOVE_QUALITY_TIERS.map((tier) => (
            <tr key={tier} className="text-zinc-500 dark:text-zinc-400">
              <td className="px-3 py-2">{s.analysisPanel.moveQuality[tier]}</td>
              <td className="px-3 py-2 text-right">{mine.counts[tier]}</td>
              <td className="px-3 py-2 text-right">{theirs.counts[tier]}</td>
            </tr>
          ))}
        </TableShell>
        <EvalGraph
          evals={analysis.evals}
          movesSan={movesSan}
          initialFen={positions[0]}
          currentPly={exploring ? null : currentPly}
          onSelect={jumpTo}
        />
        {badTiers.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">{s.analysisPanel.yourMoves}</p>
            {badTiers.map((tier) => (
              <div key={tier} className="flex flex-col gap-1.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {s.analysisPanel.moveQuality[tier]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mine.plies[tier].map((ply) => (
                    <button
                      key={ply}
                      onClick={() => jumpTo(ply)}
                      aria-current={!exploring && ply === currentPly ? 'step' : undefined}
                      className={`${chipClass(!exploring && ply === currentPly)} tabular-nums`}
                    >
                      {plyLabel(ply, positions[0])} {movesSan[ply - 1]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  )
}

/** A plain-words account of the analyzed game; each move named in it jumps the board there. */
export function GameStoryCard({
  ecoName,
  myResult,
  finalResults,
}: {
  ecoName: string | null
  myResult: MyResult
  finalResults: { white: string; black: string }
}) {
  const { analysis, movesSan, myColor, positions } = useAnalysisContext()
  const { ply: currentPly, exploring, setPly, exitExploring } = useBoardContext()
  const story = useMemo(
    () =>
      analysis &&
      buildGameStory(
        analysis.evals,
        movesSan,
        positions,
        myColor,
        myResult === 'win',
        finalResults,
      ),
    [analysis, movesSan, positions, myColor, myResult, finalResults],
  )
  const s = getStrings()
  if (!story) return null
  const t = s.gameStory
  const initialFen = positions[0]

  const moveChip = (ply: number) => (
    <button
      onClick={() => {
        exitExploring()
        setPly(ply)
      }}
      aria-current={!exploring && ply === currentPly ? 'step' : undefined}
      className={`${chipClass(!exploring && ply === currentPly)} mr-2 tabular-nums`}
    >
      {plyLabel(ply, initialFen)} {movesSan[ply - 1]}
    </button>
  )

  const phases = GAME_PHASES.flatMap((phase) => {
    const accuracy = story.byPhase[phase]
    return accuracy === null ? [] : [{ phase: t.phases[phase], accuracy }]
  }).sort((a, b) => b.accuracy - a.accuracy)
  const best = phases[0]
  const worst = phases.at(-1)
  const ending = t.ending[myResult]
  const endReason = story.endReason
  const endText =
    endReason && endReason in ending ? ending[endReason as keyof typeof ending] : ending.other

  return (
    <Card title={t.title}>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <p>
          {story.afterOpening
            ? t.opening(
                ecoName,
                String(moveNumberOfPly(story.afterOpening.ply, initialFen)),
                t.standing[story.afterOpening.standing],
              )
            : t.shortGame}
        </p>
        {story.turningPoints.length === 0 ? (
          <p>{t.quiet}</p>
        ) : (
          <>
            <p>{t.turningPointsIntro(story.turningPoints.length)}</p>
            <ul className="flex flex-col gap-2">
              {story.turningPoints.map((tp) => (
                <li key={tp.ply}>
                  {moveChip(tp.ply)}
                  <span>
                    <span
                      className={
                        tp.mine
                          ? 'font-medium text-red-700 dark:text-red-400'
                          : 'font-medium text-emerald-700 dark:text-emerald-400'
                      }
                    >
                      {tp.mine ? t.mine[tp.tier] : t.theirs[tp.tier]}
                    </span>{' '}
                    {tp.missedChance && `${t.missedChance} `}
                    {t.shift(t.standing[tp.before], t.standing[tp.after])}
                    {tp.reason && ` ${describeBlunderReason(tp.reason)}`}
                    {tp.mine && tp.bestSan && ` ${t.better(tp.bestSan)}`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {story.slippedWin && story.slippedWin.ply > 0 && (
          <p>
            {moveChip(story.slippedWin.ply)}
            <span>{t.slippedWin}</span>
          </p>
        )}
        <p>
          {best && worst && best !== worst
            ? t.phaseRange(best.phase, best.accuracy, worst.phase, worst.accuracy)
            : best && t.phaseOne(best.phase, best.accuracy)}{' '}
          {story.accuracy.mine !== null &&
            story.accuracy.theirs !== null &&
            t.accuracy(story.accuracy.mine, story.accuracy.theirs)}
        </p>
        <p>
          {endText}
          {endReason !== 'checkmate' && ` ${t.finalStanding(t.standing[story.finalStanding])}`}
        </p>
      </div>
    </Card>
  )
}

const BAD_TIERS: readonly BadMoveTier[] = ['blunder', 'mistake', 'inaccuracy']
const GAME_PHASES: readonly GamePhase[] = ['opening', 'middlegame', 'endgame']
