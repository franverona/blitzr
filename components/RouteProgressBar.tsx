'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// App Router exposes no "navigation started" event (history.pushState only
// fires once the new page has already committed, i.e. too late for a
// progress bar), so this listens for the one thing that *does* happen at
// click time: a same-origin <a> click. That covers every next/link
// navigation in the app for free. The few call sites that navigate via
// router.push() instead of a Link (GameRow, AddPgnButton, DrillFilters) call
// startRouteProgress() themselves right before pushing.
let listeners: (() => void)[] = []
export function startRouteProgress() {
  listeners.forEach((fn) => fn())
}

export function RouteProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [done, setDone] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const visibleRef = useRef(false)
  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  useEffect(() => {
    function start() {
      clearTimeout(hideTimer.current)
      setDone(false)
      setVisible(true)
    }
    listeners.push(start)

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return
      const anchor = (e.target as HTMLElement).closest?.('a')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      start()
    }
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      listeners = listeners.filter((fn) => fn !== start)
    }
  }, [])

  // Fires once the new page has actually committed (pathname/search changed) —
  // the signal to finish and fade the bar out.
  useEffect(() => {
    if (!visibleRef.current) return
    setDone(true)
    hideTimer.current = setTimeout(() => setVisible(false), 200)
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div
      aria-hidden
      className="bg-accent pointer-events-none fixed top-0 left-0 z-50 h-0.5 ease-out"
      style={{
        width: done ? '100%' : '75%',
        opacity: done ? 0 : 1,
        transition: `width ${done ? 200 : 600}ms, opacity 200ms ${done ? '0ms' : '600ms'}`,
      }}
    />
  )
}
