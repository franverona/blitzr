'use client'

import { useRef } from 'react'

// Same circular "?" + centered native <dialog> convention as RepertoireBoard's
// HelpButton — the summary is "read once" content, so it belongs behind a
// toggle next to the board's nav controls rather than always on screen.
export function AboutOpeningButton({
  name,
  summary,
  sourceUrl,
}: {
  name: string
  summary: string
  sourceUrl: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`About ${name}`}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        ?
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 m-0 max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-700 bg-zinc-900 p-0 text-left text-zinc-100 backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">About {name}</h2>
            <button
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="text-zinc-500 hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-zinc-400">{summary}</p>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:underline"
          >
            Adapted from Wikibooks&rsquo; Chess Opening Theory
          </a>
        </div>
      </dialog>
    </>
  )
}
