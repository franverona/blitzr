'use client'

import { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { importPgnInbox, listArchivesToSync, syncArchiveMonth } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import type { Game } from '@/lib/types'
import { useBulkAnalysis } from './BulkAnalysisProvider'
import { Dialog } from './Dialog'
import { GameList } from './GameList'
import { buttonClass } from './styles'

// Long enough to reach the "Analyze them" button.
const ACTION_TOAST_DURATION_MS = 12000

interface SyncContextValue {
  isPending: boolean
  progress: { done: number; total: number } | null
  sync: () => void
}

const SyncContext = createContext<SyncContextValue | null>(null)

// One toast at a time: a new sync's replaces the last one's.
const TOAST_ID = 'sync'
// Its own toast, so the other site's result still shows.
const SITE_ERROR_TOAST_ID = 'sync-site-error'
const INBOX_TOAST_ID = 'sync-inbox'
const INBOX_ERROR_TOAST_ID = 'sync-inbox-error'

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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  // The last sync's games from BLITZR_PGN_INBOX: their import time sorts them among the rest.
  const [imported, setImported] = useState<Game[]>([])
  const importedRef = useRef<HTMLDialogElement>(null)
  const s = getStrings()

  function sync({ quiet = false } = {}) {
    toast.dismiss(TOAST_ID)
    toast.dismiss(SITE_ERROR_TOAST_ID)
    toast.dismiss(INBOX_TOAST_ID)
    toast.dismiss(INBOX_ERROR_TOAST_ID)
    startTransition(async () => {
      try {
        // First, as it needs no network.
        const inbox = await importPgnInbox()
        if (inbox.error) toast.error(inbox.error, { id: INBOX_ERROR_TOAST_ID })
        if (inbox.ok && inbox.imported.length > 0) {
          setImported(inbox.imported)
          toast(
            <>
              {s.sync.imported(inbox.imported.length, inbox.skipped)}
              <button
                onClick={() => importedRef.current?.showModal()}
                className={buttonClass({ size: 'sm' })}
              >
                {s.sync.showImported}
              </button>
            </>,
            { id: INBOX_TOAST_ID, duration: ACTION_TOAST_DURATION_MS },
          )
        } else if (inbox.ok && inbox.skipped > 0) {
          toast(s.sync.imported(0, inbox.skipped), { id: INBOX_TOAST_ID })
        }
        const pending = await listArchivesToSync()
        if (!pending.ok) {
          toast.error(pending.error, { id: TOAST_ID })
          return
        }
        if (pending.error) toast.error(pending.error, { id: SITE_ERROR_TOAST_ID })
        // Counted in, so imported games get the "Analyze them" offer too.
        let gamesUpserted = inbox.ok ? inbox.imported.length : 0
        for (const [i, archiveYm] of pending.archives.entries()) {
          setProgress({ done: i, total: pending.archives.length })
          const month = await syncArchiveMonth(archiveYm)
          if (!month.ok) {
            // Months already synced stay saved; the next sync resumes.
            toast.error(month.error, { id: TOAST_ID })
            return
          }
          gamesUpserted += month.gamesUpserted
        }
        // An automatic sync that found nothing new stays silent.
        if (quiet && gamesUpserted === 0) return
        const text = s.sync.synced(pending.archives.length, gamesUpserted)
        if (gamesUpserted === 0) {
          toast(text, { id: TOAST_ID })
          return
        }
        toast(
          <>
            {text}
            <AnalyzeNewButton />
          </>,
          { id: TOAST_ID, duration: ACTION_TOAST_DURATION_MS },
        )
      } catch {
        toast.error(s.sync.failed, { id: TOAST_ID })
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
      <Dialog ref={importedRef} title={s.sync.importedTitle} className="w-full max-w-3xl">
        {/* The provider outlives navigation, so following a game's link must close the dialog. */}
        <div onClick={(e) => (e.target as Element).closest('a') && importedRef.current?.close()}>
          <GameList
            games={imported}
            accuracyByGameId={{}}
            filtered={false}
            headClassName="bg-zinc-100 dark:bg-zinc-950"
          />
        </div>
      </Dialog>
    </SyncContext.Provider>
  )
}

// Its own component so it reads live bulk state, hiding once a run starts: the Toaster renders the
// toast's message, not this provider (so the Toaster must sit inside BulkAnalysisProvider).
function AnalyzeNewButton() {
  const bulk = useBulkAnalysis()
  if (bulk.progress !== null) return null
  return (
    <button onClick={bulk.start} className={buttonClass({ size: 'sm' })}>
      {getStrings().sync.analyzeNew}
    </button>
  )
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('Must be used within <SyncProvider>')
  return ctx
}
