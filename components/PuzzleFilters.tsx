'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'
import { startRouteProgress } from './RouteProgressBar'
import { Select } from './Select'
import { chipClass, INPUT_CLASS } from './styles'

export type PuzzleStatusFilter = 'all' | 'solved' | 'unsolved'
export type PuzzleColorFilter = 'all' | 'white' | 'black'
export type PuzzleKindFilter = 'all' | 'mate' | 'defend'

/** URL-driven filters; the server page does the filtering. */
export function PuzzleFilters({
  status,
  color,
  kind,
  mateIn,
  availableMateIns,
}: {
  status: PuzzleStatusFilter
  color: PuzzleColorFilter
  kind: PuzzleKindFilter
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
  const KIND_TABS: { value: PuzzleKindFilter; label: string }[] = [
    { value: 'all', label: s.puzzlesPage.filters.allKinds },
    { value: 'mate', label: s.puzzlesPage.filters.mateKind },
    { value: 'defend', label: s.puzzlesPage.filters.defendKind },
  ]

  function hrefFor(next: {
    status?: string
    color?: string
    kind?: string
    mateIn?: string
  }): string {
    const params = new URLSearchParams(searchParams.toString())
    // Reset paging so the page number can't overrun a narrower result set.
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
            className={chipClass(active)}
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
            className={chipClass(active)}
          >
            {tab.label}
          </Link>
        )
      })}
      {KIND_TABS.map((tab) => {
        const active = kind === tab.value
        return (
          <Link
            key={tab.value}
            href={hrefFor({ kind: tab.value === 'all' ? undefined : tab.value })}
            className={chipClass(active)}
          >
            {tab.label}
          </Link>
        )
      })}
      {availableMateIns.length > 0 && (
        <Select
          value={mateIn ?? ''}
          onChange={(e) => {
            startRouteProgress()
            router.push(hrefFor({ mateIn: e.target.value || undefined }))
          }}
          className={INPUT_CLASS}
        >
          <option value="">{s.puzzlesPage.filters.allMateIn}</option>
          {availableMateIns.map((n) => (
            <option key={n} value={n}>
              {s.puzzles.mateIn(n)}
            </option>
          ))}
        </Select>
      )}
    </div>
  )
}
