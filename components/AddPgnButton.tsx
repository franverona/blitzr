'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { addManualGame } from '@/app/actions'
import type { ManualGameSide } from '@/lib/manualGame'
import { getStrings } from '@/lib/i18n/strings'
import { Dialog } from './Dialog'
import { ErrorText } from './ErrorText'
import { CirclePlusIcon } from './NavIcons'
import { Select } from './Select'
import { startRouteProgress } from './RouteProgressBar'
import { buttonClass } from './styles'

// Errors show inline so they sit next to the pasted text.
export function AddPgnButton() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pgn, setPgn] = useState('')
  const [side, setSide] = useState<ManualGameSide>('auto')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const s = getStrings()

  // The draft survives closing (a stray backdrop click); it's cleared once a game is added.
  function open() {
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
        setPgn('')
        setSide('auto')
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
      <button onClick={open} className={`flex items-center gap-1.5 ${buttonClass({ size: 'sm' })}`}>
        <CirclePlusIcon className="size-4 shrink-0" />
        {s.addPgn.button}
      </button>
      <Dialog
        ref={dialogRef}
        title={s.addPgn.title}
        className="w-full max-w-lg"
        onSubmit={handleSubmit}
      >
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
        {error && <ErrorText>{error}</ErrorText>}
        <button
          type="submit"
          disabled={isPending}
          className={`self-end ${buttonClass({ variant: 'primary' })}`}
        >
          {isPending ? s.addPgn.adding : s.addPgn.submit}
        </button>
      </Dialog>
    </>
  )
}
