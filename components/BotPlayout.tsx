'use client'

import { useRouter } from 'next/navigation'
import {
  BOT_ELOS,
  botMovetimeMs,
  botUciOptions,
  isApproximateElo,
  type BotElo,
} from '@/lib/botStrength'
import { getStrings } from '@/lib/i18n/strings'
import type { MyColor } from '@/lib/types'
import { PlayoutBoard } from './PlayoutBoard'
import { startRouteProgress } from './RouteProgressBar'
import { Select } from './Select'
import { INPUT_CLASS } from './styles'

/** A position from one of the user's games played out against Stockfish at `elo`. */
export function BotPlayout({
  gameId,
  ply,
  initialFen,
  myColor,
  elo,
}: {
  gameId: string
  ply: number
  initialFen: string
  myColor: MyColor
  elo: BotElo
}) {
  const s = getStrings()
  const router = useRouter()

  // Changing it reloads the page, so it's locked mid-game rather than discarding the game.
  const strengthPicker = (inProgress: boolean) => (
    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <abbr title={s.playBot.approximateHelp}>{s.playBot.strength}</abbr>
      <Select
        value={elo}
        disabled={inProgress}
        onChange={(e) => {
          startRouteProgress()
          router.push(`/games/${gameId}/play?ply=${ply}&elo=${e.target.value}`)
        }}
        className={INPUT_CLASS}
      >
        {BOT_ELOS.map((level) => (
          <option key={level} value={level}>
            {s.playBot.eloLabel(level, isApproximateElo(level))}
          </option>
        ))}
      </Select>
      {inProgress && <span className="text-xs">{s.playBot.strengthLocked}</span>}
    </label>
  )

  return (
    <PlayoutBoard
      initialFen={initialFen}
      myColor={myColor}
      engineOptions={botUciOptions(elo)}
      movetimeMs={botMovetimeMs(elo)}
      allowResign
      sidebar={{ top: strengthPicker, className: 'lg:max-w-xs xl:max-w-sm' }}
      messages={{
        thinking: s.playBot.thinking,
        won: s.playBot.won,
        drawn: s.playBot.drawn,
        lost: s.playBot.lost,
      }}
      // lg+: 11rem ≈ the header, status row and coordinates around the board.
      boardMaxWidthClassName="max-w-160 lg:max-w-[min(40rem,calc(100dvh-11rem))] xl:max-w-[min(43rem,calc(100dvh-11rem))] 2xl:max-w-[min(46rem,calc(100dvh-11rem))]"
    />
  )
}
