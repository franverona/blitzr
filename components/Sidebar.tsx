'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { BulkAnalysisIndicator } from '@/components/BulkAnalysisIndicator'
import { NavLinks } from '@/components/NavLinks'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { getStrings } from '@/lib/i18n/strings'
import { ChevronLeftIcon, MoonIcon, SunIcon } from './NavIcons'

const COLLAPSED_COOKIE = 'blitzr-sidebar-collapsed'
const THEME_COOKIE = 'blitzr-theme'

// Below `md` the sidebar is always icon-only — width and label visibility
// both fall back to plain Tailwind breakpoints for that, no JS media query
// needed. `collapsed` state only controls the md+ toggle. Its initial value
// comes from a cookie read server-side (RootLayout), not localStorage read
// client-side after mount — that would flash "expanded" on every refresh,
// since the server can't see localStorage but can see a cookie.
export function Sidebar({
  username,
  avatarUrl,
  initialCollapsed,
  initialTheme,
}: {
  username: string | null
  avatarUrl: string | null
  initialCollapsed: boolean
  initialTheme: 'light' | 'dark'
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [theme, setTheme] = useState(initialTheme)
  const s = getStrings()

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      document.cookie = `${COLLAPSED_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
      return next
    })
  }

  // The `dark` class lives on <html> (app/layout.tsx), not anything Sidebar
  // itself renders, so toggling it needs a direct DOM write rather than
  // relying on this component's own re-render.
  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      return next
    })
  }

  const labelClassName = collapsed ? 'hidden' : 'hidden md:inline'
  // Icon-only rows (mobile always, or md+ while collapsed) need a smaller,
  // symmetric horizontal padding — the expanded px-3 leaves only 16px of a
  // 40px-wide collapsed row, so a 20-24px icon overflows the padding box
  // and gets clipped on one side by the aside's scroll clipping (overflow-y
  // implicitly makes overflow-x non-visible too), reading as "off-center".
  const iconRowClassName = collapsed
    ? 'justify-center px-1.5'
    : 'justify-center px-1.5 md:justify-start md:px-3'

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
          className={`flex h-10 min-w-0 items-center gap-2 text-lg font-semibold tracking-tight ${iconRowClassName}`}
        >
          <Image src="/icon.svg" alt="" width={24} height={24} className="shrink-0" />
          <span className={`truncate ${labelClassName}`}>Blitzr</span>
        </Link>
        <NavLinks collapsed={collapsed} />
        <div className={collapsed ? 'hidden' : 'hidden md:block'}>
          <BulkAnalysisIndicator />
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? s.nav.switchToLight : s.nav.switchToDark}
          aria-label={theme === 'dark' ? s.nav.switchToLight : s.nav.switchToDark}
          className={`flex items-center gap-2 rounded-md py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${iconRowClassName}`}
        >
          {theme === 'dark' ? (
            <SunIcon className="size-5 shrink-0" />
          ) : (
            <MoonIcon className="size-5 shrink-0" />
          )}
          <span className={labelClassName}>
            {theme === 'dark' ? s.nav.switchToLight : s.nav.switchToDark}
          </span>
        </button>
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
