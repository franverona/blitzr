'use client'

import { useState, useTransition } from 'react'
import { syncGames } from '@/app/actions'

export function SyncButton() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await syncGames()
        setMessage(
          `Synced ${result.archivesSynced} archive${result.archivesSynced === 1 ? '' : 's'}, ${result.gamesUpserted} game${result.gamesUpserted === 1 ? '' : 's'} added.`,
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed.')
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? 'Syncing…' : 'Sync games'}
      </button>
      {message && <span className="text-sm text-zinc-600 dark:text-zinc-400">{message}</span>}
      {error && <span className="text-sm text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  )
}
