'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Games' },
  { href: '/openings', label: 'Openings' },
  { href: '/learn', label: 'Learn' },
  { href: '/repertoire', label: 'Repertoire' },
  { href: '/drill', label: 'Drill' },
  { href: '/blunders', label: 'Blunders' },
]

// Nested detail routes don't share their section's own path prefix in one
// case: game pages live under /games/:id, not under the Games link's own
// href ("/"). Every other section's detail routes (e.g. /learn/:slug) do
// nest under their own link, so a plain prefix check is enough for those.
function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/games/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map((link) => {
        const isActive = isLinkActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-accent/20 font-medium text-zinc-900 dark:text-white'
                : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
