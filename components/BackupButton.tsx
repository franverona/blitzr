'use client'

import { useState, useTransition } from 'react'
import { exportDatabaseBackup } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { ErrorText } from './ErrorText'
import { buttonClass } from './styles'

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
      <button onClick={handleClick} disabled={isPending} className={buttonClass()}>
        {isPending ? s.settings.backupPreparing : s.settings.backup}
      </button>
      {error && <ErrorText className="text-xs">{error}</ErrorText>}
    </div>
  )
}
