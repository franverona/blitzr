'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { getStrings } from '@/lib/i18n/strings'
import { ANALYSIS_STRENGTHS, type AnalysisStrength } from '@/lib/stockfish/analyze'
import { type DeleteGameTarget, useDeleteGame } from './DeleteGameButton'
import { ErrorText } from './ErrorText'
import { useAnalysisContext } from './GameAnalysisPanel'
import { IconButton } from './IconButton'
import { Spinner } from './Spinner'

const ITEM_CLASS =
  'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm whitespace-nowrap hover:bg-zinc-100 focus-visible:bg-zinc-100 disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800'
const PANEL_CLASS =
  'flex-col rounded-md border border-zinc-300 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900'

/**
 * "⋯" menu with the game page's actions. Analyze opens a submenu of strengths on hover or focus
 * (to the left: the menu sits at the viewport's right edge). The trigger spins while it runs.
 */
export function GameActionsMenu({
  canAnalyze,
  deleteTarget,
}: {
  canAnalyze: boolean
  deleteTarget?: DeleteGameTarget
}) {
  const [open, setOpen] = useState(false)
  const { analysis, progress, error, handleAnalyze } = useAnalysisContext()
  const { deleteGame, isPending } = useDeleteGame(deleteTarget)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const s = getStrings()
  const savedStrength = (Object.keys(ANALYSIS_STRENGTHS) as AnalysisStrength[]).find(
    (k) => ANALYSIS_STRENGTHS[k] === analysis?.movetimeMs,
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <IconButton
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={s.gamePage.actions}
        title={s.gamePage.actions}
        className={`text-base ${error ? 'border-rose-400 dark:border-rose-700' : ''}`}
      >
        {progress ? <Spinner className="size-3" /> : '⋯'}
      </IconButton>
      <div
        id={panelId}
        hidden={!open}
        className={`absolute top-full right-0 z-20 mt-1 flex min-w-44 ${PANEL_CLASS}`}
      >
        {error && <ErrorText className="max-w-64 px-2.5 py-1.5 text-sm">{error}</ErrorText>}
        {canAnalyze && (
          <div className="group/sub relative">
            <button disabled={progress !== null} aria-haspopup="true" className={ITEM_CLASS}>
              {progress ? (
                `${analysis ? s.analysisPanel.reanalyzing : s.analysisPanel.analyzing}… (${progress.done}/${progress.total})`
              ) : (
                <>
                  <span aria-hidden="true" className="w-3 text-zinc-500 dark:text-zinc-400">
                    ‹
                  </span>
                  {analysis ? s.analysisPanel.reanalyze : s.analysisPanel.analyzeWithStockfish}
                </>
              )}
            </button>
            {progress === null && (
              <div
                className={`absolute -top-1 right-full hidden min-w-36 group-focus-within/sub:flex group-hover/sub:flex ${PANEL_CLASS}`}
              >
                {(Object.keys(ANALYSIS_STRENGTHS) as AnalysisStrength[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setOpen(false)
                      handleAnalyze(k)
                    }}
                    title={
                      k === savedStrength
                        ? s.analysisPanel.savedAtStrength(s.settings.analysisStrengths[k])
                        : undefined
                    }
                    className={ITEM_CLASS}
                  >
                    <span aria-hidden="true" className="w-3">
                      {k === savedStrength && '✓'}
                    </span>
                    {s.settings.analysisStrengths[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {deleteTarget && (
          <button onClick={deleteGame} disabled={isPending} className={ITEM_CLASS}>
            <span aria-hidden="true" className="w-3" />
            {s.gamePage.deleteGame}
          </button>
        )}
      </div>
    </div>
  )
}
