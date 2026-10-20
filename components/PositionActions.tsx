'use client'

import { useEffect, useState } from 'react'
import { getStrings } from '@/lib/i18n/strings'
import { lichessAnalysisUrl, linePgn } from '@/lib/share'
import { useBoardContext } from './Board'
import { buttonClass } from './styles'

const COPIED_FEEDBACK_MS = 1500

const BUTTON_CLASS = buttonClass({ size: 'xs' })

/** Copy FEN/PGN and open in Lichess for the position on screen. While
 *  exploring, the PGN is the explored line instead of the recorded game. */
export function PositionActions({ pgn }: { pgn: string }) {
  const s = getStrings()
  const {
    displayFen,
    boardOrientation,
    exploring,
    explorePath,
    explorePly,
    ply,
    movesSan,
    positions,
  } = useBoardContext()
  const [copied, setCopied] = useState<'fen' | 'pgn' | null>(null)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(null), COPIED_FEEDBACK_MS)
    return () => clearTimeout(timeout)
  }, [copied])

  function copy(kind: 'fen' | 'pgn') {
    const text =
      kind === 'fen'
        ? displayFen
        : exploring
          ? linePgn(positions[0], [...movesSan.slice(0, ply), ...explorePath.slice(0, explorePly)])
          : pgn
    navigator.clipboard.writeText(text).then(
      () => setCopied(kind),
      () => {},
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => copy('fen')} className={BUTTON_CLASS}>
        {copied === 'fen' ? s.positionActions.copied : s.positionActions.copyFen}
      </button>
      <button onClick={() => copy('pgn')} className={BUTTON_CLASS}>
        {copied === 'pgn'
          ? s.positionActions.copied
          : exploring
            ? s.positionActions.copyLinePgn
            : s.positionActions.copyPgn}
      </button>
      <a
        href={lichessAnalysisUrl(displayFen, boardOrientation)}
        target="_blank"
        rel="noopener noreferrer"
        className={BUTTON_CLASS}
      >
        {s.positionActions.openInLichess}
      </a>
    </div>
  )
}
