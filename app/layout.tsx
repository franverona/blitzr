import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Suspense } from 'react'
import { BulkAnalysisProvider } from '@/components/BulkAnalysisProvider'
import { RouteProgressBar } from '@/components/RouteProgressBar'
import { Sidebar } from '@/components/Sidebar'
import { fetchPlayerAvatar } from '@/lib/chesscom/client'
import { getChesscomUsername } from '@/lib/config'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
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
  title: getStrings().metadata.title,
  description: getStrings().metadata.description,
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
      lang={getLocale()}
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <BulkAnalysisProvider>
          <Sidebar username={username} avatarUrl={avatarUrl} />
          <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </BulkAnalysisProvider>
      </body>
    </html>
  )
}
