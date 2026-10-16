'use client'

import { getStrings } from '@/lib/i18n/strings'
import { useBulkAnalysis } from './BulkAnalysisProvider'

// In the sidebar so a running bulk analysis stays visible on every page.
export function BulkAnalysisIndicator() {
  const { progress, cancel } = useBulkAnalysis()
  const s = getStrings()

  if (!progress) return null

  return (
    <div className="flex flex-col gap-1 border-t border-zinc-200 px-1 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <span>
        {s.bulkAnalyze.analyzingProgress(progress.gamesDone + 1, progress.gamesTotal)}
        {progress.positionsTotal > 0 &&
          ` ${s.bulkAnalyze.positionsProgress(progress.positionsDone, progress.positionsTotal)}`}
        …
      </span>
      <button
        onClick={cancel}
        className="self-start underline hover:text-zinc-900 dark:hover:text-zinc-200"
      >
        {s.bulkAnalyze.cancel}
      </button>
    </div>
  )
}
