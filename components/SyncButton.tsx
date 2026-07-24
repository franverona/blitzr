'use client'

import { useEffect, useState, useTransition } from 'react'
import { syncGames } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'

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
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? s.sync.syncing : s.sync.button}
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
