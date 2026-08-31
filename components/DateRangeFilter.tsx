'use client'

import { useRouter } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'

// Same padding/text-size on both so the preset buttons and the date inputs
// render at identical heights sitting in one row.
const INPUT_CLASS =
  'rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900'
const PRESET_BUTTON_CLASS =
  'rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700'

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "N days ago" as a `<input type="date">` value, in local time — 0 is
 *  today. Used both to compute a preset's own from/to and, at render time,
 *  to tell whether the current from/to already matches one (so its button
 *  can render as active). */
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

/**
 * Scopes every section on /blunders (the aggregates and the accuracy trend
 * chart alike) to a date range — URL-driven (`?from=&to=`), same
 * "survives reload, shareable link" pattern GameSearchForm's own filters
 * use. A row of common presets sits above two native `<input type="date">`
 * fields for anything a preset doesn't cover. Neither needs a debounce (a
 * date picker/button commits immediately, not per keystroke the way typing
 * does) or a popover — everything here is compact enough to sit inline.
 */
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
              className={`${PRESET_BUTTON_CLASS} ${
                active
                  ? 'bg-accent/20 font-medium text-zinc-900 dark:text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
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
