'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'
import {
  ChessPawnIcon,
  DumbbellIcon,
  GraduationCapIcon,
  LibraryBigIcon,
  PuzzleIcon,
  ShieldAlertIcon,
  SunIcon,
  SwatchBookIcon,
} from './NavIcons'

const LINK_ROUTES = [
  { href: '/', key: 'today', Icon: SunIcon },
  { href: '/games', key: 'games', Icon: ChessPawnIcon },
  { href: '/openings', key: 'openings', Icon: SwatchBookIcon },
  { href: '/learn', key: 'learn', Icon: GraduationCapIcon },
  { href: '/repertoire', key: 'repertoire', Icon: LibraryBigIcon },
  { href: '/drill', key: 'drill', Icon: DumbbellIcon },
  { href: '/puzzles', key: 'puzzles', Icon: PuzzleIcon },
  { href: '/blunders', key: 'blunders', Icon: ShieldAlertIcon },
] as const

// "/" (Today) would otherwise prefix-match every route.
function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()
  const s = getStrings()
  // Icon-only rows need tighter padding or the icon gets clipped off-center.
  const iconRowClassName = collapsed
    ? 'justify-center px-1.5'
    : 'justify-center px-1.5 md:justify-start md:px-3'

  return (
    <nav className="flex flex-col gap-0.5">
      {LINK_ROUTES.map((link) => {
        const isActive = isLinkActive(pathname, link.href)
        const label = s.nav[link.key]
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            title={label}
            className={`flex items-center gap-2 rounded-md py-2 text-sm transition-colors ${iconRowClassName} ${
              isActive
                ? 'bg-accent/20 font-medium text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            <link.Icon className={`size-5 shrink-0 ${isActive ? 'text-accent' : ''}`} />
            <span className={collapsed ? 'hidden' : 'hidden md:inline'}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
