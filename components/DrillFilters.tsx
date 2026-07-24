'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'
import type { DrillSourceType } from '@/lib/types'

/** URL-driven deck filters (`?type=`/`?opening=`), same pattern as
 *  `RepertoireBoard.tsx`'s `ColorTab` — a real navigation, not client state,
 *  so `DrillSession` (keyed on these values in `app/drill/page.tsx`) remounts
 *  with a fresh session instead of keeping the previous filter's frozen one. */
export function DrillFilters({
  sourceType,
  opening,
  availableOpenings,
}: {
  sourceType?: DrillSourceType
  opening?: string
  availableOpenings: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const s = getStrings()
  const TYPE_TABS: { value: DrillSourceType | 'all'; label: string; title?: string }[] = [
    { value: 'all', label: s.drillFilters.all },
    { value: 'deviation', label: s.drillFilters.deviations, title: s.drillFilters.deviationsTitle },
    { value: 'blunder', label: s.drillFilters.blunders, title: s.drillFilters.blundersTitle },
  ]

  function hrefFor(next: { type?: string; opening?: string }): string {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const query = params.toString()
    return query ? `/drill?${query}` : '/drill'
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {TYPE_TABS.map((tab) => {
        const active = (sourceType ?? 'all') === tab.value
        return (
          <Link
            key={tab.value}
            href={hrefFor({ type: tab.value === 'all' ? undefined : tab.value })}
            className={`rounded-md border px-3 py-1 ${
              active
                ? 'border-accent bg-accent/20 text-white'
                : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {tab.title ? <abbr title={tab.title}>{tab.label}</abbr> : tab.label}
          </Link>
        )
      })}
      {availableOpenings.length > 0 && (
        <select
          value={opening ?? ''}
          onChange={(e) => router.push(hrefFor({ opening: e.target.value || undefined }))}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300"
        >
          <option value="">{s.drillFilters.allOpenings}</option>
          {availableOpenings.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
