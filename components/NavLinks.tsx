'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getStrings } from '@/lib/i18n/strings'
import {
  ChessPawnIcon,
  DumbbellIcon,
  GraduationCapIcon,
  LibraryBigIcon,
  ShieldAlertIcon,
  SwatchBookIcon,
} from './NavIcons'

const LINK_ROUTES = [
  { href: '/', key: 'games', Icon: ChessPawnIcon },
  { href: '/openings', key: 'openings', Icon: SwatchBookIcon },
  { href: '/learn', key: 'learn', Icon: GraduationCapIcon },
  { href: '/repertoire', key: 'repertoire', Icon: LibraryBigIcon },
  { href: '/drill', key: 'drill', Icon: DumbbellIcon },
  { href: '/blunders', key: 'blunders', Icon: ShieldAlertIcon },
] as const

// Nested detail routes don't share their section's own path prefix in one
// case: game pages live under /games/:id, not under the Games link's own
// href ("/"). Every other section's detail routes (e.g. /learn/:slug) do
// nest under their own link, so a plain prefix check is enough for those.
function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/games/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()
  const s = getStrings()
  // Icon-only rows (mobile always, or md+ while collapsed) need a smaller,
  // symmetric horizontal padding — the expanded px-3 leaves only 16px of a
  // 40px-wide collapsed row, so a 20px icon overflows the padding box and
  // gets clipped on one side by the aside's scroll clipping (overflow-y
  // implicitly makes overflow-x non-visible too), reading as "off-center".
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
