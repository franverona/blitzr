'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { getStrings } from '@/lib/i18n/strings'
import type { GameSite } from '@/lib/types'
import { Dialog } from './Dialog'
import { FunnelIcon, StarIcon } from './NavIcons'
import { Select } from './Select'
import { SiteIcon } from './SiteIcon'
import { INPUT_CLASS, buttonClass, chipClass } from './styles'

const SEARCH_DEBOUNCE_MS = 400
const DEFAULT_ACCURACY_THRESHOLD = 80
const SITES: GameSite[] = ['chesscom', 'lichess']

type Filters = {
  q?: string
  result?: string
  color?: string
  rated?: string
  site?: string
  tc?: string
  accOp?: string
  accValue?: string
  practice?: string
  fav?: string
  sort?: string
  dir?: string
}

/** The URL's accuracy, or the default when unset; 0 is a value, not unset. */
function sliderAccuracy(accValue: string | undefined): number {
  const n = accValue ? Number(accValue) : NaN
  return Number.isFinite(n) ? n : DEFAULT_ACCURACY_THRESHOLD
}

/** Opponent search, plus a Filters button whose side panel holds the rest, all in the URL.
 *  Text and slider changes are debounced; everything else navigates immediately, panel open. */
export function GameSearchForm({
  defaultValue,
  result,
  color,
  rated,
  site,
  showSite,
  tc,
  timeClasses,
  accOp,
  accValue,
  practice,
  fav,
  sort,
  count,
}: {
  defaultValue: string
  result?: string
  color?: string
  rated?: string
  site?: string
  /** Only once games come from more than one site. */
  showSite: boolean
  tc?: string
  /** The games' time classes, most played first. */
  timeClasses: string[]
  accOp?: string
  accValue?: string
  /** `'1'`: practice games only, which have no accuracy filter (it reads stats data). */
  practice?: string
  fav?: string
  /** The list's sort, kept across filter changes, which go back to page 1. */
  sort?: { sort?: string; dir?: string }
  /** "612 games · 1–50", shown beside the Filters button. */
  count?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const [accuracy, setAccuracy] = useState(sliderAccuracy(accValue))
  const router = useRouter()
  const s = getStrings()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDialogElement>(null)

  // Cancel a pending navigation on unmount, or it fires against stale props.
  useEffect(() => () => clearDebounce(), [])

  // Unkeyed, so the panel stays open across its own navigations: state seeded from the URL
  // re-syncs from props during render instead, e.g. on back/forward.
  const [prevAccValue, setPrevAccValue] = useState(accValue)
  if (accValue !== prevAccValue) {
    setPrevAccValue(accValue)
    setAccuracy(sliderAccuracy(accValue))
  }

  // Our own search navigations are skipped: they can land after more was typed.
  const [prevQ, setPrevQ] = useState(defaultValue)
  const [pushedQ, setPushedQ] = useState<string | null>(null)
  if (defaultValue !== prevQ) {
    setPrevQ(defaultValue)
    if (defaultValue !== pushedQ) {
      setValue(defaultValue)
      setPushedQ(null)
    }
  }

  function clearDebounce() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  function navigate(next: Filters) {
    const params = new URLSearchParams()
    const merged: Filters = {
      q: value.trim(),
      result,
      color,
      rated,
      site,
      tc,
      accOp,
      accValue,
      practice,
      fav,
      ...sort,
      ...next,
    }
    for (const [key, val] of Object.entries(merged)) {
      if (val) params.set(key, val)
    }
    setPushedQ(merged.q ?? '')
    const query = params.toString()
    router.push(query ? `/games?${query}` : '/games')
  }

  function debouncedNavigate(next: Filters) {
    clearDebounce()
    debounceRef.current = setTimeout(() => navigate(next), SEARCH_DEBOUNCE_MS)
  }

  const active = [result, color, rated, site, tc, accOp, practice, fav].filter(Boolean).length

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        clearDebounce()
        navigate({ q: value.trim() })
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => {
          const next = e.target.value
          setValue(next)
          // Clearing the field navigates immediately and drops `q`.
          if (next === '') {
            clearDebounce()
            navigate({ q: '' })
          } else {
            debouncedNavigate({ q: next.trim() })
          }
        }}
        placeholder={s.gamesPage.searchPlaceholder}
        className={`w-full max-w-xs ${INPUT_CLASS}`}
      />

      {count && (
        <span className="text-sm text-zinc-600 sm:ml-auto dark:text-zinc-400">{count}</span>
      )}

      <button
        type="button"
        onClick={() => panelRef.current?.showModal()}
        aria-label={active > 0 ? s.gamesPage.filtersActive(active) : undefined}
        className={`flex items-center gap-1.5 ${count ? '' : 'sm:ml-auto'} ${buttonClass({ size: 'sm' })}`}
      >
        <FunnelIcon className="size-4 shrink-0" />
        {s.gamesPage.filters}
        {active > 0 && (
          <span className="bg-accent min-w-5 rounded-full px-1.5 text-center text-xs leading-5 font-semibold text-white tabular-nums">
            {active}
          </span>
        )}
      </button>

      <Dialog
        ref={panelRef}
        title={s.gamesPage.filters}
        placement="right"
        className="w-80"
        bodyClassName="gap-5 p-5"
      >
        <FilterField label={s.gameList.headers.result}>
          <Select
            value={result ?? ''}
            onChange={(e) => navigate({ result: e.target.value })}
            className={`w-full ${INPUT_CLASS}`}
          >
            <option value="">{s.gamesPage.allResults}</option>
            <option value="win">{s.common.result.win}</option>
            <option value="draw">{s.common.result.draw}</option>
            <option value="loss">{s.common.result.loss}</option>
          </Select>
        </FilterField>

        <FilterField label={s.gameList.headers.color}>
          <Select
            value={color ?? ''}
            onChange={(e) => navigate({ color: e.target.value })}
            className={`w-full ${INPUT_CLASS}`}
          >
            <option value="">{s.gamesPage.allColors}</option>
            <option value="white">{s.common.color.white}</option>
            <option value="black">{s.common.color.black}</option>
          </Select>
        </FilterField>

        {/* Practice games are never rated, and were played here, on neither site. */}
        {!practice && (
          <FilterField label={s.gamesPage.ratedFilter}>
            <Select
              value={rated ?? ''}
              onChange={(e) => navigate({ rated: e.target.value })}
              className={`w-full ${INPUT_CLASS}`}
            >
              <option value="">{s.gamesPage.allRated}</option>
              <option value="true">{s.gamesPage.rated}</option>
              <option value="false">{s.gamesPage.unrated}</option>
            </Select>
          </FilterField>
        )}

        {!practice && showSite && (
          <FilterField label={s.gameList.headers.site}>
            <div className="flex gap-2">
              {SITES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={site === option}
                  // Pressed again, it clears: no site pressed means both.
                  onClick={() => navigate({ site: site === option ? '' : option })}
                  className={`flex items-center gap-2 ${chipClass(site === option)}`}
                >
                  <SiteIcon site={option} decorative />
                  {s.common.site[option]}
                </button>
              ))}
            </div>
          </FilterField>
        )}

        {!practice && (timeClasses.length > 1 || tc) && (
          <FilterField label={s.gameList.headers.timeClass}>
            <Select
              value={tc ?? ''}
              onChange={(e) => navigate({ tc: e.target.value })}
              className={`w-full ${INPUT_CLASS}`}
            >
              <option value="">{s.gamesPage.allTimeClasses}</option>
              {timeClasses.map((option) => (
                <option key={option} value={option}>
                  {s.common.timeClass[option as keyof typeof s.common.timeClass] ?? option}
                </option>
              ))}
            </Select>
          </FilterField>
        )}

        {!practice && (
          <FilterField label={s.gameList.headers.accuracy}>
            <AccuracyFilter
              accOp={accOp}
              accuracy={accuracy}
              onOpChange={(op) => navigate({ accOp: op, accValue: op ? String(accuracy) : '' })}
              onAccuracyChange={(next) => {
                setAccuracy(next)
                debouncedNavigate({ accOp, accValue: String(next) })
              }}
            />
          </FilterField>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={Boolean(fav)}
            onClick={() => navigate(fav ? { fav: '' } : { fav: '1', practice: '' })}
            className={`flex items-center gap-1.5 ${chipClass(Boolean(fav))}`}
          >
            <StarIcon className="size-4 shrink-0 fill-current stroke-[2.5] text-amber-500 dark:text-amber-400" />
            {s.gamesPage.favoritesOnly}
          </button>
          <button
            type="button"
            aria-pressed={Boolean(practice)}
            onClick={() =>
              navigate(
                practice
                  ? { practice: '' }
                  : {
                      practice: '1',
                      accOp: '',
                      accValue: '',
                      rated: '',
                      site: '',
                      tc: '',
                      fav: '',
                    },
              )
            }
            className={chipClass(Boolean(practice))}
          >
            {s.gamesPage.practiceOnly}
          </button>
        </div>

        {active > 0 && (
          <button
            type="button"
            onClick={() =>
              navigate({
                result: '',
                color: '',
                rated: '',
                site: '',
                tc: '',
                accOp: '',
                accValue: '',
                practice: '',
                fav: '',
              })
            }
            className={`self-start ${buttonClass({ size: 'sm' })}`}
          >
            {s.gamesPage.clearFilters}
          </button>
        )}
      </Dialog>
    </form>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-600 uppercase dark:text-zinc-400">
        {label}
      </span>
      {children}
    </div>
  )
}

function AccuracyFilter({
  accOp,
  accuracy,
  onOpChange,
  onAccuracyChange,
}: {
  accOp?: string
  accuracy: number
  onOpChange: (op: string) => void
  onAccuracyChange: (n: number) => void
}) {
  const s = getStrings()
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex gap-1">
        {(['', 'gte', 'lte'] as const).map((op) => (
          <button
            key={op || 'any'}
            type="button"
            aria-pressed={(accOp ?? '') === op}
            onClick={() => onOpChange(op)}
            className={`flex-1 rounded px-2 py-1 text-xs whitespace-nowrap ${
              (accOp ?? '') === op
                ? 'bg-accent/20 font-medium text-zinc-900 dark:text-white'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {op === '' ? s.gamesPage.anyAccuracy : op === 'gte' ? '≥' : '≤'}
          </button>
        ))}
      </div>

      {accOp && (
        <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <input
            type="range"
            min={0}
            max={100}
            value={accuracy}
            onChange={(e) => onAccuracyChange(Number(e.target.value))}
            className="accent-accent w-full"
          />
          <span className="w-10 shrink-0 tabular-nums">{accuracy}%</span>
        </label>
      )}
    </div>
  )
}
