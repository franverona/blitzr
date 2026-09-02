'use client'

import { useEffect, useState, useTransition } from 'react'
import { syncGames } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { RefreshCwIcon } from './NavIcons'

const TOAST_DURATION_MS = 4000

export function SyncButton() {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null)
  const s = getStrings()

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [toast])

  function handleClick() {
    setToast(null)
    startTransition(async () => {
      try {
        const result = await syncGames()
        setToast({
          text: s.sync.synced(result.archivesSynced, result.gamesUpserted),
          isError: false,
        })
      } catch (err) {
        setToast({
          text: err instanceof Error ? err.message : s.sync.failed,
          isError: true,
        })
      }
    })
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <RefreshCwIcon className={`size-4 shrink-0 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? s.sync.syncing : s.sync.button}
      </button>
      {toast && (
        <div
          role="status"
          onClick={() => setToast(null)}
          className={`fixed right-4 bottom-4 z-50 max-w-sm cursor-pointer rounded-md border px-4 py-2.5 text-sm shadow-lg ${
            toast.isError
              ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
              : 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  )
}
