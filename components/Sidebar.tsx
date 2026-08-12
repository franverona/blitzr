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
    <aside
      className={`flex shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 px-2 py-4 dark:border-zinc-800 ${
        collapsed ? 'w-14' : 'w-14 md:w-40'
      }`}
    >
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 px-1 text-lg font-semibold tracking-tight"
      >
        <Image src="/icon.svg" alt="" width={24} height={24} className="shrink-0" />
        <span className={`truncate ${labelClassName}`}>Blitzr</span>
      </Link>
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? s.nav.expand : s.nav.collapse}
        className="hidden shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 md:flex dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <ChevronLeftIcon
          className={`size-4 shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`}
        />
        <span className={labelClassName}>{s.nav.collapse}</span>
      </button>
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
  )
}
