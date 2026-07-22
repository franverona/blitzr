import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { NavLinks } from '@/components/NavLinks'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Blitzr',
  description:
    'Train on your own blunders, not generic puzzles — a local chess trainer built from your real Chess.com games.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <aside className="flex w-40 shrink-0 flex-col gap-4 border-r border-zinc-200 px-2 py-4 dark:border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight"
          >
            <Image src="/icon.svg" alt="" width={24} height={24} />
            Blitzr
          </Link>
          <NavLinks />
        </aside>
        <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
      </body>
    </html>
  )
}
