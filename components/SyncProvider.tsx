'use client'

import { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react'
import { listArchivesToSync, syncArchiveMonth } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { useBulkAnalysis } from './BulkAnalysisProvider'
import { buttonClass } from './styles'
import { Toast, useToast } from './Toast'

// Long enough to reach the "Analyze them" button.
const ACTION_TOAST_DURATION_MS = 12000

interface SyncContextValue {
  isPending: boolean
  progress: { done: number; total: number } | null
  sync: () => void
}

const SyncContext = createContext<SyncContextValue | null>(null)

interface SyncToast {
  text: string
  isError: boolean
  offerAnalysis?: boolean
  durationMs?: number
}

/**
 * Root-layout sync state, so a sync started on open (`autoSync`, set by the
 * layout when the last one is stale) shows on the games page's button too.
 */
export function SyncProvider({
  autoSync,
  children,
}: {
  autoSync: boolean
  children: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useToast<SyncToast>()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const bulk = useBulkAnalysis()
  const s = getStrings()

  function sync({ quiet = false } = {}) {
    setToast(null)
    startTransition(async () => {
      try {
        const pending = await listArchivesToSync()
        if (!pending.ok) {
          setToast({ text: pending.error, isError: true })
          return
        }
        let gamesUpserted = 0
        for (const [i, archiveYm] of pending.archives.entries()) {
          setProgress({ done: i, total: pending.archives.length })
          const month = await syncArchiveMonth(archiveYm)
          if (!month.ok) {
            // Months already synced stay saved; the next sync resumes.
            setToast({ text: month.error, isError: true })
            return
          }
          gamesUpserted += month.gamesUpserted
        }
        // An automatic sync that found nothing new stays silent.
        if (quiet && gamesUpserted === 0) return
        setToast({
          text: s.sync.synced(pending.archives.length, gamesUpserted),
          isError: false,
          offerAnalysis: gamesUpserted > 0,
          durationMs: gamesUpserted > 0 ? ACTION_TOAST_DURATION_MS : undefined,
        })
      } catch {
        setToast({ text: s.sync.failed, isError: true })
      } finally {
        setProgress(null)
      }
    })
  }

  // A ref, not deps: once per page load, and Strict Mode runs effects twice.
  const autoSynced = useRef(false)
  useEffect(() => {
    if (!autoSync || autoSynced.current) return
    autoSynced.current = true
    sync({ quiet: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync])

  return (
    <SyncContext.Provider value={{ isPending, progress, sync: () => sync() }}>
      {children}
      {toast && (
        <Toast isError={toast.isError} onClose={() => setToast(null)}>
          {toast.text}
          {toast.offerAnalysis && bulk.progress === null && (
            <button onClick={bulk.start} className={buttonClass({ size: 'sm' })}>
              {s.sync.analyzeNew}
            </button>
          )}
        </Toast>
      )}
    </SyncContext.Provider>
  )
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('Must be used within <SyncProvider>')
  return ctx
}
