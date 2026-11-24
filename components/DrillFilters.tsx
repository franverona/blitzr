'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'
import type { DrillSourceType } from '@/lib/types'
import { startRouteProgress } from './RouteProgressBar'
import { Select } from './Select'
import { chipClass, INPUT_CLASS } from './styles'

/** The page title with the filters. URL-driven so `DrillSession` (keyed on these values)
 *  remounts with a fresh session. */
export function DrillFilters({
  sourceType,
  opening,
}: {
  sourceType?: DrillSourceType
  opening?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const s = getStrings()
  const TYPES: { value: DrillSourceType | 'all'; label: string; title?: string }[] = [
    { value: 'all', label: s.drillFilters.all },
    { value: 'deviation', label: s.drillFilters.deviations, title: s.drillFilters.deviationsTitle },
    { value: 'blunder', label: s.drillFilters.blunders, title: s.drillFilters.blundersTitle },
    { value: 'punish', label: s.drillFilters.punishes, title: s.drillFilters.punishesTitle },
    { value: 'mate', label: s.drillFilters.mates, title: s.drillFilters.matesTitle },
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold">{s.drillPage.title}</h1>
        <Select
          aria-label={s.drillFilters.typeLabel}
          title={TYPES.find((t) => t.value === (sourceType ?? 'all'))?.title}
          value={sourceType ?? 'all'}
          onChange={(e) => {
            startRouteProgress()
            router.push(hrefFor({ type: e.target.value === 'all' ? undefined : e.target.value }))
          }}
          className={INPUT_CLASS}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value} title={t.title}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>
      {/* Only reachable from Today's weak spot link. */}
      {opening && (
        <Link
          href={hrefFor({ opening: undefined })}
          title={s.drillFilters.clearOpening}
          className={`w-fit text-sm ${chipClass(true)}`}
        >
          {opening} ✕
        </Link>
      )}
    </div>
  )
}
