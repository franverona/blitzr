'use client'

import { useRef } from 'react'
import { getStrings } from '@/lib/i18n/strings'

/** The accuracy/engine-lines/repertoire/checklist stack that used to sit
 *  below the move list (`app/games/[id]/page.tsx`'s old `sidebarExtra`) —
 *  moved behind a single trigger + dialog so the move list itself can grow
 *  to fill the whole sidebar column (`MoveList.tsx`'s `lg:flex-1`) instead
 *  of sharing it with a tall stack of secondary panels. A generic
 *  trigger+dialog shell rather than a game-page-specific one since its
 *  content is passed in as `children` — the composition itself (which
 *  panels, in what order) still lives in `app/games/[id]/page.tsx`, same as
 *  before. */
export function DetailsDialogTrigger({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
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
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 m-0 max-h-[85vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-0 text-left text-zinc-900 backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">{s.gamePage.gameDetails}</h2>
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
