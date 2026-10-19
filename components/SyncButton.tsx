'use client'

import { getStrings } from '@/lib/i18n/strings'
import { RefreshCwIcon } from './NavIcons'
import { useSync } from './SyncProvider'

export function SyncButton() {
  const { isPending, progress, sync } = useSync()
  const s = getStrings()

  return (
    <button
      onClick={sync}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
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
