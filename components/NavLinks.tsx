'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Games' },
  { href: '/openings', label: 'Openings' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      {LINKS.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`border-b-2 pb-0.5 text-sm transition-colors ${
              isActive
                ? 'border-[#769656] font-medium text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </>
  )
}
