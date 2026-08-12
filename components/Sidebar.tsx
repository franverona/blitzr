'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BulkAnalysisIndicator } from '@/components/BulkAnalysisIndicator'
import { NavLinks } from '@/components/NavLinks'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { getStrings } from '@/lib/i18n/strings'
import { ChevronLeftIcon } from './NavIcons'

const COLLAPSED_KEY = 'blitzr-sidebar-collapsed'

// Below `md` the sidebar is always icon-only — width and label visibility
// both fall back to plain Tailwind breakpoints for that, no JS media query
// needed. `collapsed` state only controls the md+ toggle; it's read from
// localStorage after mount (a one-frame flash of "expanded" is an acceptable
// tradeoff for a local single-user app, not worth a cookie round-trip).
export function Sidebar({
  username,
  avatarUrl,
}: {
  username: string | null
  avatarUrl: string | null
}) {
  const [collapsed, setCollapsed] = useState(false)
  const s = getStrings()

  useEffect(() => {
    // Reading localStorage during the initial render (instead of here) would
    // mismatch the server-rendered HTML, since it isn't available server-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  const labelClassName = collapsed ? 'hidden' : 'hidden md:inline'

  return (
    // The toggle button lives on this wrapper, not on the scrollable <aside>
    // itself — overflow-y-auto implicitly makes overflow-x auto too (CSS: an
    // axis left "visible" while the other isn't computes to "auto"), which
    // would clip a button positioned half outside the border. Its `top-9`
    // is the logo row's own height (h-10) plus the aside's py-4 padding,
    // so it lines up with the app name/icon row instead of the full sidebar.
    <div className={`relative flex h-full shrink-0 ${collapsed ? 'w-14' : 'w-14 md:w-40'}`}>
      <aside className="flex w-full flex-col gap-4 overflow-y-auto border-r border-zinc-200 px-2 py-4 dark:border-zinc-800">
        <Link
          href="/"
          className={`flex h-10 min-w-0 items-center gap-2 px-1 text-lg font-semibold tracking-tight ${
            collapsed ? 'justify-center' : 'justify-center md:justify-start'
          }`}
        >
          <Image src="/icon.svg" alt="" width={24} height={24} className="shrink-0" />
          <span className={`truncate ${labelClassName}`}>Blitzr</span>
        </Link>
        <NavLinks collapsed={collapsed} />
        <div className={collapsed ? 'hidden' : 'hidden md:block'}>
          <BulkAnalysisIndicator />
        </div>
        {username && (
          <div className="mt-auto flex items-center gap-2 border-t border-zinc-200 px-1 pt-3 dark:border-zinc-800">
            <PlayerAvatar username={username} avatarUrl={avatarUrl} />
            <span
              className={`min-w-0 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300 ${labelClassName}`}
            >
              {username}
            </span>
          </div>
        )}
      </aside>
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? s.nav.expand : s.nav.collapse}
        className="absolute top-9 -right-3 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 shadow-sm hover:text-zinc-900 md:flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ChevronLeftIcon
          className={`size-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  )
}
