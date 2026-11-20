'use client'

import { getStrings } from '@/lib/i18n/strings'
import { useBulkAnalysis } from './BulkAnalysisProvider'
import { CpuIcon } from './NavIcons'
import { Spinner } from './Spinner'
import { buttonClass } from './styles'

export function BulkAnalyzeButton({ unanalyzedGames }: { unanalyzedGames: number }) {
  const { progress, start, cancel } = useBulkAnalysis()
  const s = getStrings()
  // A page-load snapshot; start() still re-checks.
  const hasUnanalyzedGames = unanalyzedGames > 0
  const disabled = progress !== null || !hasUnanalyzedGames

  return (
    <div className="flex flex-wrap items-center gap-3">
      {hasUnanalyzedGames && progress === null && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {s.bulkAnalyze.unanalyzed(unanalyzedGames)}
        </p>
      )}
      <button
        onClick={start}
        disabled={disabled}
        title={
          !hasUnanalyzedGames && progress === null ? s.bulkAnalyze.nothingToAnalyze : undefined
        }
        className={`flex items-center gap-1.5 whitespace-nowrap ${buttonClass({ size: 'sm' })}`}
      >
        {progress ? <Spinner /> : <CpuIcon className="size-4 shrink-0" />}
        {progress ? (
          <>
            {s.bulkAnalyze.analyzingProgress(progress.gamesDone + 1, progress.gamesTotal)}
            {progress.positionsTotal > 0 &&
              ` ${s.bulkAnalyze.positionsProgress(progress.positionsDone, progress.positionsTotal)}`}
            …
          </>
        ) : (
          s.bulkAnalyze.button
        )}
      </button>
      {progress && (
        <button
          onClick={cancel}
          className="text-sm text-zinc-600 underline hover:text-zinc-200 dark:text-zinc-500"
        >
          {s.bulkAnalyze.cancel}
        </button>
      )}
    </div>
  )
}
