'use client'

import { useState, useTransition } from 'react'
import { exportDatabaseBackup } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'

export function BackupButton() {
  const s = getStrings()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await exportDatabaseBackup()
      if (!result.ok) {
        setError(result.error)
        return
      }
      const url = URL.createObjectURL(new Blob([result.data], { type: 'application/vnd.sqlite3' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `blitzr-backup-${new Date().toISOString().slice(0, 10)}.db`
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {isPending ? s.settings.backupPreparing : s.settings.backup}
      </button>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
