'use client'

import { useId, useRef } from 'react'
import { tabClass } from './styles'

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
  orientation = 'horizontal',
  children,
}: {
  tabs: readonly { id: T; label: React.ReactNode }[]
  selected: T
  onSelect: (id: T) => void
  /** Names the tablist for screen readers. */
  label: string
  panelClassName?: string
  /** `vertical`: a side rail at lg+, a scrolling strip below. */
  orientation?: 'horizontal' | 'vertical'
  children: React.ReactNode
}) {
  const baseId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const tabId = (id: T) => `${baseId}-tab-${id}`
  const panelId = `${baseId}-panel`

  function onKeyDown(e: React.KeyboardEvent) {
    const index = tabs.findIndex((t) => t.id === selected)
    // A vertical rail is a horizontal strip below lg, so it takes both axes.
    const vertical = orientation === 'vertical'
    const next =
      e.key === 'ArrowRight' || (vertical && e.key === 'ArrowDown')
        ? (index + 1) % tabs.length
        : e.key === 'ArrowLeft' || (vertical && e.key === 'ArrowUp')
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
        aria-orientation={orientation}
        onKeyDown={onKeyDown}
        className={
          orientation === 'vertical'
            ? 'flex shrink-0 overflow-x-auto border-b border-zinc-200 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-l dark:border-zinc-800'
            : 'flex shrink-0 border-b border-zinc-200 dark:border-zinc-800'
        }
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
              className={tabClass(active, orientation === 'vertical')}
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
