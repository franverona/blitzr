'use client'

import { getStrings } from '@/lib/i18n/strings'
import { useBulkAnalysis } from './BulkAnalysisProvider'
import { CpuIcon } from './NavIcons'
import { Spinner } from './Spinner'
import { buttonClass } from './styles'

export function BulkAnalyzeButton({ hasUnanalyzedGames }: { hasUnanalyzedGames: boolean }) {
  const { progress, start, cancel } = useBulkAnalysis()
  const s = getStrings()
  // hasUnanalyzedGames is a page-load snapshot; start() still re-checks.
  const disabled = progress !== null || !hasUnanalyzedGames

  return (
    <div className="flex items-center gap-3">
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
        <button onClick={cancel} className="text-sm text-zinc-500 underline hover:text-zinc-200">
          {s.bulkAnalyze.cancel}
        </button>
      )}
    </div>
  )
}
