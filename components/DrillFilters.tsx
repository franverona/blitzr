'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'
import type { DrillSourceType } from '@/lib/types'
import { chipClass } from './styles'

/** URL-driven so `DrillSession` (keyed on these values) remounts with a
 *  fresh session. */
export function DrillFilters({
  sourceType,
  opening,
}: {
  sourceType?: DrillSourceType
  opening?: string
}) {
  const searchParams = useSearchParams()
  const s = getStrings()
  const TYPE_TABS: { value: DrillSourceType | 'all'; label: string; title?: string }[] = [
    { value: 'all', label: s.drillFilters.all },
    { value: 'deviation', label: s.drillFilters.deviations, title: s.drillFilters.deviationsTitle },
    { value: 'blunder', label: s.drillFilters.blunders, title: s.drillFilters.blundersTitle },
    { value: 'punish', label: s.drillFilters.punishes, title: s.drillFilters.punishesTitle },
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
            className={chipClass(active)}
          >
            {tab.title ? <abbr title={tab.title}>{tab.label}</abbr> : tab.label}
          </Link>
        )
      })}
      {/* Only reachable from Today's weak spot link. */}
      {opening && (
        <Link
          href={hrefFor({ opening: undefined })}
          title={s.drillFilters.clearOpening}
          className={chipClass(true)}
        >
          {opening} ✕
        </Link>
      )}
    </div>
  )
}
