'use client'

import { useRef } from 'react'
import { getStrings } from '@/lib/i18n/strings'
import { Dialog } from './Dialog'
import { IconButton } from './IconButton'
import { LINK_CLASS } from './styles'

// Used for both opening and endgame lessons.
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
  const s = getStrings()

  return (
    <>
      <IconButton
        onClick={() => dialogRef.current?.showModal()}
        aria-label={s.aboutOpening.about(name)}
      >
        ?
      </IconButton>
      <Dialog ref={dialogRef} title={s.aboutOpening.about(name)}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm ${LINK_CLASS}`}
        >
          {s.aboutOpening.adaptedFrom}
        </a>
      </Dialog>
    </>
  )
}
