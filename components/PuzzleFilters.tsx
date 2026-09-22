'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'
import { startRouteProgress } from './RouteProgressBar'

export type PuzzleStatusFilter = 'all' | 'solved' | 'unsolved'
export type PuzzleColorFilter = 'all' | 'white' | 'black'

/** URL-driven puzzle-list filters (`?status=`/`?color=`/`?mateIn=`), same
 *  "real navigation, not client state" pattern as DrillFilters — a filter
 *  change is a normal link click, so the list page (a server component)
 *  re-fetches solved ids and re-filters server-side rather than this
 *  component owning any of that itself. */
export function PuzzleFilters({
  status,
  color,
  mateIn,
  availableMateIns,
}: {
  status: PuzzleStatusFilter
  color: PuzzleColorFilter
  mateIn?: number
  availableMateIns: number[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const s = getStrings()

  const STATUS_TABS: { value: PuzzleStatusFilter; label: string }[] = [
    { value: 'all', label: s.puzzlesPage.filters.allStatus },
    { value: 'unsolved', label: s.puzzlesPage.filters.unsolvedOnly },
    { value: 'solved', label: s.puzzlesPage.filters.solvedOnly },
  ]
  const COLOR_TABS: { value: PuzzleColorFilter; label: string }[] = [
    { value: 'all', label: s.puzzlesPage.filters.allColors },
    { value: 'white', label: s.common.color.white },
    { value: 'black', label: s.common.color.black },
  ]

  function hrefFor(next: { status?: string; color?: string; mateIn?: string }): string {
    const params = new URLSearchParams(searchParams.toString())
    // A filter change always drops the current page — same convention
    // GameSearchForm's own navigate() uses (it never carries `page` into its
    // built params at all) — otherwise a page number from a wider result set
    // could point past the end of a newly-narrowed one.
    params.delete('page')
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const query = params.toString()
    return query ? `/puzzles?${query}` : '/puzzles'
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {STATUS_TABS.map((tab) => {
        const active = status === tab.value
        return (
          <Link
            key={tab.value}
            href={hrefFor({ status: tab.value === 'all' ? undefined : tab.value })}
            className={`rounded-md border px-3 py-1 ${
              active
                ? 'border-accent bg-accent/20 text-zinc-900 dark:text-white'
                : 'border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
      {COLOR_TABS.map((tab) => {
        const active = color === tab.value
        return (
          <Link
            key={tab.value}
            href={hrefFor({ color: tab.value === 'all' ? undefined : tab.value })}
            className={`rounded-md border px-3 py-1 ${
              active
                ? 'border-accent bg-accent/20 text-zinc-900 dark:text-white'
                : 'border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
      {availableMateIns.length > 0 && (
        <select
          value={mateIn ?? ''}
          onChange={(e) => {
            startRouteProgress()
            router.push(hrefFor({ mateIn: e.target.value || undefined }))
          }}
          className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <option value="">{s.puzzlesPage.filters.allMateIn}</option>
          {availableMateIns.map((n) => (
            <option key={n} value={n}>
              {s.puzzles.mateIn(n)}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
