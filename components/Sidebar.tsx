'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BulkAnalysisIndicator } from '@/components/BulkAnalysisIndicator'
import { NavLinks } from '@/components/NavLinks'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { getStrings } from '@/lib/i18n/strings'
import { ChevronLeftIcon, SettingsIcon } from './NavIcons'

// Duplicated in app/layout.tsx; see SettingsProvider.tsx for why.
const COLLAPSED_COOKIE = 'blitzr-sidebar-collapsed'

// Below `md` the sidebar is always icon-only; `collapsed` only affects md+.
export function Sidebar({
  username,
  avatarUrl,
  initialCollapsed,
}: {
  username: string | null
  avatarUrl: string | null
  initialCollapsed: boolean
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const settingsActive = usePathname() === '/settings'
  const s = getStrings()

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      document.cookie = `${COLLAPSED_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
      return next
    })
  }

  const labelClassName = collapsed ? 'hidden' : 'hidden md:inline'
  // Icon-only rows need tighter padding or the icon gets clipped off-center.
  const iconRowClassName = collapsed
    ? 'justify-center px-1.5'
    : 'justify-center px-1.5 md:justify-start md:px-3'

  return (
    // The toggle sits on this wrapper because the <aside>'s overflow-y-auto
    // would clip it. `top-9` aligns it with the logo row.
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
        {/* One shared mt-auto: separate auto margins would split the free space. */}
        <div className="mt-auto flex flex-col">
          <Link
            href="/settings"
            aria-current={settingsActive ? 'page' : undefined}
            title={s.settings.trigger}
            className={`mb-2 flex items-center gap-2 rounded-md py-2 text-sm transition-colors ${iconRowClassName} ${
              settingsActive
                ? 'bg-accent/20 font-medium text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            <SettingsIcon className={`size-5 shrink-0 ${settingsActive ? 'text-accent' : ''}`} />
            <span className={labelClassName}>{s.settings.trigger}</span>
          </Link>
          {username && (
            <div className="flex items-center gap-2 border-t border-zinc-200 px-1 pt-3 dark:border-zinc-800">
              <PlayerAvatar username={username} avatarUrl={avatarUrl} />
              <span
                className={`min-w-0 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300 ${labelClassName}`}
              >
                {username}
              </span>
            </div>
          )}
        </div>
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
