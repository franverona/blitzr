'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { savePracticeGame } from '@/app/actions'
import { botMovetimeMs, botUciOptions, type BotElo } from '@/lib/botStrength'
import { getStrings } from '@/lib/i18n/strings'
import type { MyColor } from '@/lib/types'
import { BotStrengthSelect } from './BotStrengthSelect'
import { PlayoutBoard } from './PlayoutBoard'
import { startRouteProgress } from './RouteProgressBar'
import { LINK_CLASS } from './styles'

const TOAST_ID = 'practice-save'
// Long enough to reach the link.
const SAVED_TOAST_DURATION_MS = 10_000

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
    <BotStrengthSelect
      value={elo}
      locked={inProgress}
      onChange={(level) => {
        startRouteProgress()
        router.push(`/games/${gameId}/play?ply=${ply}&elo=${level}`)
      }}
    />
  )

  // Saved once it ends, unless the user never moved (the server refuses those too).
  async function handleGameOver(movesSan: string[], _outcome: unknown, resigned: boolean) {
    const startsWithMe = initialFen.split(' ')[1] === myColor[0]
    const myMoves = startsWithMe ? Math.ceil(movesSan.length / 2) : Math.floor(movesSan.length / 2)
    if (myMoves === 0) return
    // A rejected action (a restarting server, say) would otherwise lose the game silently.
    const result = await savePracticeGame(gameId, ply, movesSan, elo, resigned).catch(
      () => ({ ok: false, error: s.playBot.saveFailed }) as const,
    )
    if (!result.ok) {
      toast.error(result.error, { id: TOAST_ID })
      return
    }
    toast(
      <span>
        {s.playBot.saved}{' '}
        <Link href={`/games/${result.gameId}`} className={LINK_CLASS}>
          {s.playBot.analyzeIt}
        </Link>
      </span>,
      { id: TOAST_ID, duration: SAVED_TOAST_DURATION_MS },
    )
  }

  return (
    <PlayoutBoard
      onGameOver={handleGameOver}
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
      // lg+: 5.5rem ≈ the one-line header and the coordinates under the board. The width caps
      // leave the sidebar its room; height is what binds on a 13" laptop.
      boardMaxWidthClassName="max-w-160 lg:max-w-[min(42rem,calc(100dvh-5.5rem))] xl:max-w-[min(50rem,calc(100dvh-5.5rem))] 2xl:max-w-[min(56rem,calc(100dvh-5.5rem))]"
    />
  )
}
