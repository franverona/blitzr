'use client'

import { getStrings } from '@/lib/i18n/strings'
import { useBulkAnalysis } from './BulkAnalysisProvider'

export function BulkAnalyzeButton() {
  const { progress, start, cancel } = useBulkAnalysis()
  const s = getStrings()

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={start}
        disabled={progress !== null}
        className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-zinc-800 disabled:opacity-50"
      >
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
