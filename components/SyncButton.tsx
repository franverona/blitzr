'use client'

import { getStrings } from '@/lib/i18n/strings'
import { RefreshCwIcon } from './NavIcons'
import { useSync } from './SyncProvider'
import { buttonClass } from './styles'

export function SyncButton() {
  const { isPending, progress, sync } = useSync()
  const s = getStrings()

  return (
    <button
      onClick={sync}
      disabled={isPending}
      className={`flex items-center gap-1.5 ${buttonClass({ size: 'sm' })}`}
    >
      <RefreshCwIcon className={`size-4 shrink-0 ${isPending ? 'animate-spin' : ''}`} />
      {progress
        ? s.sync.progress(progress.done, progress.total)
        : isPending
          ? s.sync.syncing
          : s.sync.button}
    </button>
  )
}
