'use client'

import { BOT_ELOS, isApproximateElo, isBotElo, type BotElo } from '@/lib/botStrength'
import { getStrings } from '@/lib/i18n/strings'
import { Select } from './Select'
import { INPUT_CLASS } from './styles'

/** Locked mid-game, so a change never discards one. `null` is full strength, offered only when
 *  `fullStrengthOption` is set. */
export function BotStrengthSelect({
  value,
  onChange,
  locked,
  fullStrengthOption = false,
}: {
  value: BotElo | null
  onChange: (elo: BotElo | null) => void
  locked: boolean
  fullStrengthOption?: boolean
}) {
  const s = getStrings()
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <abbr title={s.playBot.approximateHelp}>{s.playBot.strength}</abbr>
      <Select
        value={value ?? ''}
        disabled={locked}
        onChange={(e) => {
          const elo = Number(e.target.value)
          onChange(isBotElo(elo) ? elo : null)
        }}
        className={INPUT_CLASS}
      >
        {fullStrengthOption && <option value="">{s.playBot.fullStrength}</option>}
        {BOT_ELOS.map((level) => (
          <option key={level} value={level}>
            {s.playBot.eloLabel(level, isApproximateElo(level))}
          </option>
        ))}
      </Select>
      {locked && (
        <span title={s.playBot.strengthLocked}>
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span className="sr-only">{s.playBot.strengthLocked}</span>
        </span>
      )}
    </label>
  )
}
