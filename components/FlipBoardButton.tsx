'use client'

import { getStrings } from '@/lib/i18n/strings'
import { useBoardContext } from './Board'

// Same circular icon-button styling as AboutOpeningButton/RepertoireBoard's
// HelpButton, so it reads as one matching set of controls next to
// BoardNavControls. Only exposed on the /learn lesson board — game replay
// pages fix orientation to the synced player's color and never render this.
export function FlipBoardButton() {
  const { setBoardOrientation } = useBoardContext()
  const s = getStrings()

  return (
    <button
      onClick={() => setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))}
      aria-label={s.flipBoard.ariaLabel}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
    >
      ⇅
    </button>
  )
}
