'use client'

import { createContext, useContext, useState } from 'react'
import { boardNotationStyles, getBoardColorPreset } from '@/lib/theme'

// Not shared with app/layout.tsx's own read of this same cookie — a plain
// constant exported from a 'use client' module doesn't reliably cross back
// into a Server Component (Next.js treats the whole module as a client
// reference boundary), so the literal is duplicated instead, same as
// Sidebar.tsx's THEME_COOKIE/COLLAPSED_COOKIE already are relative to
// layout.tsx's own inline cookie names.
const BOARD_COLOR_COOKIE = 'blitzr-board-color'

interface BoardColorsContextValue {
  presetId: string
  dark: string
  light: string
  darkSquareNotationStyle: { color: string; fontWeight: 'bold' }
  lightSquareNotationStyle: { color: string; fontWeight: 'bold' }
  setBoardColorPreset: (id: string) => void
}

const BoardColorsContext = createContext<BoardColorsContextValue | null>(null)

export function useBoardColors(): BoardColorsContextValue {
  const ctx = useContext(BoardColorsContext)
  if (!ctx) throw new Error('Must be used within <BoardColorsProvider>')
  return ctx
}

// Mounted once in the root layout, seeded from the blitzr-board-color cookie
// read server-side there — same zero-flash reasoning as the theme toggle's
// own cookie (app/layout.tsx also bakes the resolved accent color straight
// into <html>'s inline style from that same server read, so there's nothing
// left for the client to visibly correct after hydration). A Context, not
// the localStorage + useSyncExternalStore this used before: board colors
// need to be known *before* first paint (react-chessboard's square colors
// are plain inline-style props, not something a script can patch onto
// already-rendered DOM afterward), which only a server-resolved value can
// guarantee — localStorage can't be read until the client mounts.
export function BoardColorsProvider({
  initialPresetId,
  children,
}: {
  initialPresetId: string
  children: React.ReactNode
}) {
  const [presetId, setPresetId] = useState(initialPresetId)
  const preset = getBoardColorPreset(presetId)

  function setBoardColorPreset(id: string) {
    setPresetId(id)
    document.cookie = `${BOARD_COLOR_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`
    // --color-accent (app/globals.css) is consumed via a Tailwind class, not
    // a prop this context's value can reach — kept in sync by writing it
    // directly here, same as the initial server-rendered value on <html>.
    document.documentElement.style.setProperty('--color-accent', getBoardColorPreset(id).dark)
  }

  return (
    <BoardColorsContext.Provider
      value={{
        presetId: preset.id,
        dark: preset.dark,
        light: preset.light,
        ...boardNotationStyles(preset.dark, preset.light),
        setBoardColorPreset,
      }}
    >
      {children}
    </BoardColorsContext.Provider>
  )
}
