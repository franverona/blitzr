'use client'

import { getStrings } from '@/lib/i18n/strings'
import { useBoardContext } from './BoardContext'
import { IconButton } from './IconButton'

export function FlipBoardButton() {
  const { setBoardOrientation } = useBoardContext()
  const s = getStrings()

  return (
    <IconButton
      onClick={() => setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))}
      aria-label={s.flipBoard.ariaLabel}
    >
      ⇅
    </IconButton>
  )
}
