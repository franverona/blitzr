'use client'

import { useRouter } from 'next/navigation'
import { useId, useRef, useState, useTransition } from 'react'
import { addManualGame } from '@/app/actions'
import type { ManualGameSide } from '@/lib/manualGame'
import { getStrings } from '@/lib/i18n/strings'
import { CirclePlusIcon } from './NavIcons'
import { Select } from './Select'
import { startRouteProgress } from './RouteProgressBar'

// Errors show inline so they sit next to the pasted text.
export function AddPgnButton() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [pgn, setPgn] = useState('')
  const [side, setSide] = useState<ManualGameSide>('auto')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const s = getStrings()

  function open() {
    setPgn('')
    setSide('auto')
    setError(null)
    dialogRef.current?.showModal()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await addManualGame(pgn, side)
        if (!result.ok) {
          setError(result.error || s.addPgn.genericError)
          return
        }
        dialogRef.current?.close()
        startRouteProgress()
        router.push(`/games/${result.gameId}`)
      } catch {
        // Unexpected error; its message is redacted in production.
        setError(s.addPgn.genericError)
      }
    })
  }

  return (
    <>
      <button
        onClick={open}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <CirclePlusIcon className="size-4 shrink-0" />
        {s.addPgn.button}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 m-0 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-200 bg-zinc-50 p-0 text-left text-zinc-900 backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-sm font-semibold">
              {s.addPgn.title}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={s.common.close}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
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
            className="w-full rounded-md border border-zinc-300 bg-zinc-50 p-2 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
          />
          <label className="flex flex-wrap items-center gap-2 text-sm">
            {s.addPgn.sideLabel}
            <Select
              value={side}
              onChange={(e) => setSide(e.target.value as ManualGameSide)}
              className="rounded-md border border-zinc-300 bg-zinc-50 py-1 pl-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {(['auto', 'white', 'black', 'notMine'] as const).map((value) => (
                <option key={value} value={value}>
                  {s.addPgn.sides[value]}
                </option>
              ))}
            </Select>
          </label>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="self-end rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isPending ? s.addPgn.adding : s.addPgn.submit}
          </button>
        </form>
      </dialog>
    </>
  )
}
