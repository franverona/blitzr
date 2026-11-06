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

  return (
    <div className="flex flex-col items-center gap-3">
      <label className="flex items-center gap-2 self-start text-sm text-zinc-600 lg:self-center dark:text-zinc-400">
        <abbr title={s.playBot.approximateHelp}>{s.playBot.strength}</abbr>
        <Select
          value={elo}
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
      </label>
      <PlayoutBoard
        initialFen={initialFen}
        myColor={myColor}
        engineOptions={botUciOptions(elo)}
        movetimeMs={botMovetimeMs(elo)}
        allowResign
        messages={{
          thinking: s.playBot.thinking,
          won: s.playBot.won,
          drawn: s.playBot.drawn,
          lost: s.playBot.lost,
        }}
        // lg+: 17rem ≈ the header, strength picker and status row around the board.
        boardMaxWidthClassName="max-w-140 lg:max-w-[min(35rem,calc(100dvh-17rem))]"
      />
    </div>
  )
}
