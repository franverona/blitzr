'use client'

import { getStrings } from '@/lib/i18n/strings'
import { useBulkAnalysis } from './BulkAnalysisProvider'
import { CpuIcon } from './NavIcons'

export function BulkAnalyzeButton({ hasUnanalyzedGames }: { hasUnanalyzedGames: boolean }) {
  const { progress, start, cancel } = useBulkAnalysis()
  const s = getStrings()
  // hasUnanalyzedGames is a snapshot from page load, not live — it still
  // goes stale the moment another tab (or the per-game Analyze button)
  // finishes the last one, same as it would without this prop at all. The
  // point isn't to be authoritative, just to skip the click-then-toast round
  // trip for the common case where it's obviously nothing to do; start()
  // still re-checks and falls back to that toast regardless.
  const disabled = progress !== null || !hasUnanalyzedGames

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={start}
        disabled={disabled}
        title={
          !hasUnanalyzedGames && progress === null ? s.bulkAnalyze.nothingToAnalyze : undefined
        }
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1 text-sm font-medium whitespace-nowrap hover:bg-zinc-800 disabled:opacity-50"
      >
        <CpuIcon className="size-4 shrink-0" />
        {s.bulkAnalyze.button}
      </button>
      {progress && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span>
            {s.bulkAnalyze.analyzingProgress(progress.gamesDone + 1, progress.gamesTotal)}
            {progress.positionsTotal > 0 &&
              ` ${s.bulkAnalyze.positionsProgress(progress.positionsDone, progress.positionsTotal)}`}
            …
          </span>
          <button onClick={cancel} className="text-zinc-500 underline hover:text-zinc-200">
            {s.bulkAnalyze.cancel}
          </button>
        </div>
      )}
    </div>
  )
}
