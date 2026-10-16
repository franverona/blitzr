'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// App Router has no "navigation started" event, so this listens for
// same-origin <a> clicks. router.push() callers call startRouteProgress().
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
      // Don't check `e.defaultPrevented`: next/link always prevents default.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement).closest?.('a')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      // React may reuse the focused anchor on the new page (e.g. "Next"), and
      // the browser would scroll <main> to keep it in view.
      anchor.blur()
      start()
    }
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      listeners = listeners.filter((fn) => fn !== start)
    }
  }, [])

  // The new page committed: finish the bar and scroll <main> (the real
  // scroll container, which Next's own reset doesn't target) to the top.
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
