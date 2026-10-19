'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { getStrings } from '@/lib/i18n/strings'
import { Select } from './Select'

const FILTER_TRIGGER_CLASS =
  'rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900'

const SEARCH_DEBOUNCE_MS = 400
const DEFAULT_ACCURACY_THRESHOLD = 80

/** Opponent search plus result/color/rated/accuracy filters, all in the URL.
 *  Text and slider changes are debounced; selects navigate immediately. */
export function GameSearchForm({
  defaultValue,
  result,
  color,
  rated,
  accOp,
  accValue,
}: {
  defaultValue: string
  result?: string
  color?: string
  rated?: string
  accOp?: string
  accValue?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const [accuracy, setAccuracy] = useState(Number(accValue) || DEFAULT_ACCURACY_THRESHOLD)
  const router = useRouter()
  const s = getStrings()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cancel a pending navigation on unmount, or it fires against stale props.
  useEffect(() => () => clearDebounce(), [])

  // accOp/accValue aren't in this component's key (so the popover survives
  // its own navigations), so re-sync from the prop during render instead,
  // e.g. on back/forward.
  const [prevAccValue, setPrevAccValue] = useState(accValue)
  if (accValue !== prevAccValue) {
    setPrevAccValue(accValue)
    setAccuracy(Number(accValue) || DEFAULT_ACCURACY_THRESHOLD)
  }

  // Same for `q`, or each debounced search would remount the input mid-typing.
  // Our own navigations are skipped: they can land after more was typed.
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

  function navigate(next: {
    q?: string
    result?: string
    color?: string
    rated?: string
    accOp?: string
    accValue?: string
  }) {
    const params = new URLSearchParams()
    const merged = { q: value.trim(), result, color, rated, accOp, accValue, ...next }
    for (const [key, val] of Object.entries(merged)) {
      if (val) params.set(key, val)
    }
    setPushedQ(merged.q)
    const query = params.toString()
    router.push(query ? `/games?${query}` : '/games')
  }

  function debouncedNavigate(next: Parameters<typeof navigate>[0]) {
    clearDebounce()
    debounceRef.current = setTimeout(() => navigate(next), SEARCH_DEBOUNCE_MS)
  }

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
        className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <Select
          value={result ?? ''}
          onChange={(e) => navigate({ result: e.target.value })}
          className={FILTER_TRIGGER_CLASS}
        >
          <option value="">{s.gamesPage.allResults}</option>
          <option value="win">{s.common.result.win}</option>
          <option value="draw">{s.common.result.draw}</option>
          <option value="loss">{s.common.result.loss}</option>
        </Select>

        <Select
          value={color ?? ''}
          onChange={(e) => navigate({ color: e.target.value })}
          className={FILTER_TRIGGER_CLASS}
        >
          <option value="">{s.gamesPage.allColors}</option>
          <option value="white">{s.common.color.white}</option>
          <option value="black">{s.common.color.black}</option>
        </Select>

        <Select
          value={rated ?? ''}
          onChange={(e) => navigate({ rated: e.target.value })}
          className={FILTER_TRIGGER_CLASS}
        >
          <option value="">{s.gamesPage.allRated}</option>
          <option value="true">{s.gamesPage.rated}</option>
          <option value="false">{s.gamesPage.unrated}</option>
        </Select>

        <AccuracyFilterPopover
          accOp={accOp}
          accuracy={accuracy}
          setAccuracy={setAccuracy}
          onOpChange={(op) => navigate({ accOp: op, accValue: op ? String(accuracy) : '' })}
          onAccuracyChange={(next) => debouncedNavigate({ accOp, accValue: String(next) })}
        />
      </div>
    </form>
  )
}

/** Trigger + popover so the slider doesn't reflow the filter row. Closes on
 *  outside click. */
function AccuracyFilterPopover({
  accOp,
  accuracy,
  setAccuracy,
  onOpChange,
  onAccuracyChange,
}: {
  accOp?: string
  accuracy: number
  setAccuracy: (n: number) => void
  onOpChange: (op: string) => void
  onAccuracyChange: (n: number) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const s = getStrings()

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const triggerLabel =
    accOp === 'gte'
      ? `${s.gamesPage.accuracyAtLeast} ${accuracy}%`
      : accOp === 'lte'
        ? `${s.gamesPage.accuracyAtMost} ${accuracy}%`
        : s.gamesPage.anyAccuracy

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={FILTER_TRIGGER_CLASS}>
        {triggerLabel}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 flex w-96 flex-col gap-2 rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex gap-1">
            {(['', 'gte', 'lte'] as const).map((op) => (
              <button
                key={op || 'any'}
                type="button"
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
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setAccuracy(next)
                  onAccuracyChange(next)
                }}
                className="accent-accent w-full"
              />
              <span className="w-10 shrink-0 tabular-nums">{accuracy}%</span>
            </label>
          )}
        </div>
      )}
    </div>
  )
}
