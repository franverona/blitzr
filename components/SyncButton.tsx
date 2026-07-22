'use client'

import { useEffect, useState, useTransition } from 'react'
import { syncGames } from '@/app/actions'

const TOAST_DURATION_MS = 4000

export function SyncButton() {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null)

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
          text: `Synced ${result.archivesSynced} archive${result.archivesSynced === 1 ? '' : 's'}, ${result.gamesUpserted} game${result.gamesUpserted === 1 ? '' : 's'} added.`,
          isError: false,
        })
      } catch (err) {
        setToast({
          text: err instanceof Error ? err.message : 'Sync failed.',
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
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? 'Syncing…' : 'Sync games'}
      </button>
      {toast && (
        <div
          role="status"
          onClick={() => setToast(null)}
          className={`fixed right-4 bottom-4 z-50 max-w-sm cursor-pointer rounded-md border px-4 py-2.5 text-sm shadow-lg ${
            toast.isError
              ? 'border-rose-900 bg-rose-950 text-rose-200'
              : 'border-zinc-700 bg-zinc-900 text-zinc-100'
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  )
}
