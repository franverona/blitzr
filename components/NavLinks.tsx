'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Games' },
  { href: '/openings', label: 'Openings' },
  { href: '/repertoire', label: 'Repertoire' },
  { href: '/drill', label: 'Drill' },
  { href: '/blunders', label: 'Blunders' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-[#769656]/20 font-medium text-zinc-900 dark:text-white'
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
