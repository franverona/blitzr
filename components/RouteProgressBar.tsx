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
      // Deliberately NOT checking `e.defaultPrevented` here — next/link's own
      // onClick (React's synthetic handler, which fires before this native
      // document-level listener since it's attached closer to the target)
      // always calls preventDefault() for the client-side navigations it
      // intercepts. Bailing on that would make this listener a no-op for
      // every normal Link click, which is exactly what it's meant to catch —
      // it did, for years, until this got noticed while chasing an unrelated
      // scroll-position bug.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement).closest?.('a')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      // The clicked anchor is about to become focused (if it isn't already)
      // for the rest of this client-side navigation — React reuses the same
      // DOM node across the re-render when it sits in the same tree position
      // (e.g. a pagination "Next" link, still a "Next" link on the new
      // page), so the browser sees a *focused* element move/appear as the
      // new content lands and auto-scrolls `<main>` to keep it in view,
      // fighting the scroll-to-top reset below. Blurring here, before that
      // reuse can happen, removes the thing the browser would chase.
      anchor.blur()
      start()
    }
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      listeners = listeners.filter((fn) => fn !== start)
    }
  }, [])

  // Fires once the new page has actually committed (pathname/search changed) —
  // the signal to finish and fade the bar out. `<main>` (app/layout.tsx), not
  // `window`, is the actual scroll container (`overflow-y-auto`, with `body`
  // itself `overflow-hidden`) — Next's own scroll-to-top-on-navigate only
  // targets `window`, so it's a no-op here and every client-side navigation
  // (a paginated list's Next link, a filter change, a puzzle's own
  // next/previous links, …) left the new page wherever the old one had been
  // scrolled to. Reset alongside the progress bar's own "did a real
  // navigation just commit" signal (the same `visibleRef` guard — skips the
  // initial mount, where there's nothing to reset) rather than a second
  // pathname/searchParams effect elsewhere.
  useEffect(() => {
    if (!visibleRef.current) return
    setDone(true)
    hideTimer.current = setTimeout(() => setVisible(false), 200)
    document.getElementById('main-scroll')?.scrollTo({ top: 0 })
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
