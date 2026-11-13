'use client'

import { useId, useRef } from 'react'

/**
 * A tablist and the selected tab's panel (WAI-ARIA tabs, automatic activation). The caller owns
 * the selection and renders only the selected panel's content as `children`.
 */
export function Tabs<T extends string>({
  tabs,
  selected,
  onSelect,
  label,
  panelClassName = '',
  children,
}: {
  tabs: readonly { id: T; label: React.ReactNode }[]
  selected: T
  onSelect: (id: T) => void
  /** Names the tablist for screen readers. */
  label: string
  panelClassName?: string
  children: React.ReactNode
}) {
  const baseId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const tabId = (id: T) => `${baseId}-tab-${id}`
  const panelId = `${baseId}-panel`

  function onKeyDown(e: React.KeyboardEvent) {
    const index = tabs.findIndex((t) => t.id === selected)
    const next =
      e.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? tabs.length - 1
              : null
    if (next === null) return
    // Else BoardNavControls' window listener would also step the board.
    e.preventDefault()
    e.stopPropagation()
    onSelect(tabs[next].id)
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(tabId(tabs[next].id))}`)?.focus()
  }

  return (
    <>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex shrink-0 border-b border-zinc-200 dark:border-zinc-800"
      >
        {tabs.map((tab) => {
          const active = tab.id === selected
          return (
            <button
              key={tab.id}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-accent text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(selected)}
        className={panelClassName}
      >
        {children}
      </div>
    </>
  )
}
