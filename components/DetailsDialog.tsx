'use client'

import { useId, useRef } from 'react'
import { getStrings } from '@/lib/i18n/strings'

/** Trigger + dialog for the game page's secondary panels, so the move list
 *  can fill the sidebar. */
export function DetailsDialogTrigger({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const s = getStrings()

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {s.gamePage.viewDetails}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // Opts in to BoardNavControls' keyboard shortcuts.
        data-board-shortcuts
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 m-0 max-h-[85vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-0 text-left text-zinc-900 backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-base font-semibold">
              {s.gamePage.gameDetails}
            </h2>
            <button
              onClick={() => dialogRef.current?.close()}
              aria-label={s.common.close}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-4">{children}</div>
        </div>
      </dialog>
    </>
  )
}
