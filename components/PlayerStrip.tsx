'use client'

import { clockAtPly, formatClock } from '@/lib/clock'
import { getStrings } from '@/lib/i18n/strings'
import type { MyColor, MyResult } from '@/lib/types'
import { useBoardContext } from './BoardContext'
import { PlayerAvatar } from './PlayerAvatar'
import { ResultBadge } from './ResultBadge'

export interface StripPlayer {
  username: string
  avatarUrl: string | null
  rating?: number | null
  /** Only on the user's side of their own game. */
  result?: MyResult
}

/** A player's row above or below the board; follows `boardOrientation`, so a flip swaps them. */
export function PlayerStrip({
  position,
  players,
  clocks,
  initialClock,
  initialFen,
}: {
  position: 'top' | 'bottom'
  players: Record<MyColor, StripPlayer>
  /** `plyClocks()`; null hides the clock. */
  clocks: number[] | null
  initialClock: number | null
  initialFen?: string
}) {
  const { ply, boardOrientation } = useBoardContext()
  const color: MyColor =
    position === 'bottom' ? boardOrientation : boardOrientation === 'white' ? 'black' : 'white'
  const player = players[color]
  const clock =
    clocks && initialClock != null ? clockAtPly(clocks, ply, initialClock, color, initialFen) : null
  return (
    // `contents`: BoardView lays these out in its row, the clock last, beside the material line.
    <div className="contents">
      <PlayerAvatar username={player.username} avatarUrl={player.avatarUrl} />
      <span className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {player.username}
      </span>
      {player.rating != null && (
        <span className="text-sm text-zinc-600 dark:text-zinc-500">({player.rating})</span>
      )}
      {player.result && <ResultBadge result={player.result} />}
      {clock != null && (
        <span
          title={getStrings().gamePage.clock}
          className="order-last ml-auto shrink-0 rounded bg-zinc-200 px-2 py-0.5 font-mono text-base font-semibold text-zinc-800 tabular-nums dark:bg-zinc-800 dark:text-zinc-100"
        >
          {formatClock(clock)}
        </span>
      )}
    </div>
  )
}
