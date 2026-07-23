import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { NavLinks } from '@/components/NavLinks'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { fetchPlayerAvatar } from '@/lib/chesscom/client'
import { getChesscomUsername } from '@/lib/config'
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Every page renders through this layout, so a missing/misconfigured env
  // var here shouldn't take the whole app down — unlike lib/sync.ts's own
  // call (only reached from the Sync button), this one fails soft to "not
  // shown" rather than an error boundary on every route.
  let username: string | null
  try {
    username = getChesscomUsername()
  } catch {
    username = null
  }
  // fetchPlayerAvatar() already swallows its own failures and returns null —
  // same "purely decorative, never breaks the page" contract PlayerAvatar's
  // other callers (the game page) rely on.
  const avatarUrl = username ? await fetchPlayerAvatar(username) : null

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <aside className="flex w-40 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 px-2 py-4 dark:border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight"
          >
            <Image src="/icon.svg" alt="" width={24} height={24} />
            Blitzr
          </Link>
          <NavLinks />
          {username && (
            <div className="mt-auto flex items-center gap-2 border-t border-zinc-200 px-1 pt-3 dark:border-zinc-800">
              <PlayerAvatar username={username} avatarUrl={avatarUrl} />
              <span className="min-w-0 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {username}
              </span>
            </div>
          )}
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </body>
    </html>
  )
}
