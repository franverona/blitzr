'use client'

import { useRouter } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'
import { chipClass, INPUT_CLASS } from '@/components/styles'

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "N days ago" as a local `<input type="date">` value; 0 is today. */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateInputValue(d)
}

const PRESETS = [
  { key: 'today', sinceDays: 0 },
  { key: 'last3Days', sinceDays: 2 },
  { key: 'lastWeek', sinceDays: 6 },
  { key: 'last2Weeks', sinceDays: 13 },
] as const

/** URL-driven (`?from=&to=`) date range that scopes all of /blunders. */
export function DateRangeFilter({ from, to }: { from?: string; to?: string }) {
  const router = useRouter()
  const s = getStrings()

  function navigate(next: { from?: string; to?: string }) {
    const params = new URLSearchParams()
    const merged = { from, to, ...next }
    for (const [key, val] of Object.entries(merged)) {
      if (val) params.set(key, val)
    }
    const query = params.toString()
    router.push(query ? `/blunders?${query}` : '/blunders')
  }

  const today = daysAgo(0)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((preset) => {
          const presetFrom = daysAgo(preset.sinceDays)
          const active = from === presetFrom && to === today
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => navigate({ from: presetFrom, to: today })}
              className={chipClass(active)}
            >
              {s.dateRangeFilter.presets[preset.key]}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          {s.dateRangeFilter.from}
          <input
            type="date"
            value={from ?? ''}
            max={to || undefined}
            onChange={(e) => navigate({ from: e.target.value })}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          {s.dateRangeFilter.to}
          <input
            type="date"
            value={to ?? ''}
            min={from || undefined}
            onChange={(e) => navigate({ to: e.target.value })}
            className={INPUT_CLASS}
          />
        </label>
        {(from || to) && (
          <button
            type="button"
            onClick={() => navigate({ from: '', to: '' })}
            className="text-zinc-500 hover:underline dark:text-zinc-400"
          >
            {s.dateRangeFilter.clear}
          </button>
        )}
      </div>
    </div>
  )
}
