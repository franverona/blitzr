import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { SettingsProvider } from '@/components/SettingsProvider'
import { BulkAnalysisProvider } from '@/components/BulkAnalysisProvider'
import { RouteProgressBar } from '@/components/RouteProgressBar'
import { Sidebar } from '@/components/Sidebar'
import { fetchPlayerAvatar } from '@/lib/chesscom/client'
import { getChesscomUsername } from '@/lib/config'
import { getSessionSize } from '@/lib/drill'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { getBoardColorPreset } from '@/lib/theme'
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
  // Pre-hydration fallback; globals.css sets color-scheme per theme.
  colorScheme: 'light dark',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Fail soft: a missing username shouldn't break every page.
  let username: string | null
  try {
    username = getChesscomUsername()
  } catch {
    username = null
  }
  const avatarUrl = username ? await fetchPlayerAvatar(username) : null
  // Settings are read from cookies server-side so the first paint is right
  // (no flash). Board colors in particular are inline-style props on
  // react-chessboard, so they can't be patched after render.
  const sidebarCollapsed = (await cookies()).get('blitzr-sidebar-collapsed')?.value === '1'
  const theme = (await cookies()).get('blitzr-theme')?.value === 'light' ? 'light' : 'dark'
  const boardColorPreset = getBoardColorPreset((await cookies()).get('blitzr-board-color')?.value)

  return (
    <html
      lang={getLocale()}
      className={[
        theme === 'dark' ? 'dark' : '',
        geistSans.variable,
        geistMono.variable,
        'h-full antialiased',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--color-accent': boardColorPreset.dark } as React.CSSProperties}
    >
      <body className="flex h-full overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <SettingsProvider
          initialTheme={theme}
          initialPresetId={boardColorPreset.id}
          initialAnalysisStrength={(await cookies()).get('blitzr-analysis-strength')?.value}
          initialHideEngineHints={(await cookies()).get('blitzr-hide-engine-hints')?.value === '1'}
          initialShowCoordinates={(await cookies()).get('blitzr-show-coordinates')?.value !== '0'}
          initialMoveSounds={(await cookies()).get('blitzr-move-sounds')?.value !== '0'}
          initialDrillSessionSize={getSessionSize(
            (await cookies()).get('blitzr-drill-session-size')?.value,
          )}
        >
          <BulkAnalysisProvider>
            <Sidebar
              username={username}
              avatarUrl={avatarUrl}
              initialCollapsed={sidebarCollapsed}
            />
            <main id="main-scroll" className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </BulkAnalysisProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
