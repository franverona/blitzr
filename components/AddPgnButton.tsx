'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { addManualGame } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { startRouteProgress } from './RouteProgressBar'

// Same native <dialog> convention as AboutOpeningButton.tsx. Errors are
// shown inline in the dialog (not a toast like SyncButton's) — the user
// needs to see them next to the textarea to fix and retry, not have them
// vanish off in a corner while the dialog with their pasted text is still up.
export function AddPgnButton() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pgn, setPgn] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const s = getStrings()

  function open() {
    setPgn('')
    setError(null)
    dialogRef.current?.showModal()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const game = await addManualGame(pgn)
        dialogRef.current?.close()
        startRouteProgress()
        router.push(`/games/${game.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : s.addPgn.genericError)
      }
    })
  }

  return (
    <>
      <button
        onClick={open}
        className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
      >
        {s.addPgn.button}
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 m-0 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-700 bg-zinc-900 p-0 text-left text-zinc-100 backdrop:bg-black/60"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">{s.addPgn.title}</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={s.common.close}
              className="text-zinc-500 hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
          <textarea
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            placeholder={s.addPgn.placeholder}
            rows={10}
            required
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="self-end rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-300 disabled:opacity-50"
          >
            {isPending ? s.addPgn.adding : s.addPgn.submit}
          </button>
        </form>
      </dialog>
    </>
  )
}
