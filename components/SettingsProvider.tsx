'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  ANALYSIS_STRENGTHS,
  type AnalysisStrength,
  DEFAULT_ANALYSIS_STRENGTH,
} from '@/lib/stockfish/analyze'
import { type MoveSound, moveSoundFor } from '@/lib/moveSound'
import type { SessionSize } from '@/lib/drill'
import { getBoardColorPreset } from '@/lib/theme'

// Duplicated in app/layout.tsx on purpose: a constant exported from a
// 'use client' module reads as undefined in a Server Component.
const THEME_COOKIE = 'blitzr-theme'
const BOARD_COLOR_COOKIE = 'blitzr-board-color'
const ANALYSIS_STRENGTH_COOKIE = 'blitzr-analysis-strength'
const HIDE_ENGINE_HINTS_COOKIE = 'blitzr-hide-engine-hints'
const SHOW_COORDINATES_COOKIE = 'blitzr-show-coordinates'
const MOVE_SOUNDS_COOKIE = 'blitzr-move-sounds'
const DRILL_SESSION_SIZE_COOKIE = 'blitzr-drill-session-size'

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`
}

interface SettingsContextValue {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  presetId: string
  dark: string
  light: string
  setBoardColorPreset: (id: string) => void
  analysisStrength: AnalysisStrength
  setAnalysisStrength: (strength: AnalysisStrength) => void
  /** Spoiler-free review: hides the eval bar and engine best-move arrows. */
  hideEngineHints: boolean
  setHideEngineHints: (hide: boolean) => void
  showCoordinates: boolean
  setShowCoordinates: (show: boolean) => void
  moveSounds: boolean
  setMoveSounds: (on: boolean) => void
  drillSessionSize: SessionSize
  setDrillSessionSize: (size: SessionSize) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('Must be used within <SettingsProvider>')
  return ctx
}

// Seeded from cookies read server-side in app/layout.tsx, so board colors
// (inline-style props on react-chessboard) are right on first paint.
export function SettingsProvider({
  initialTheme,
  initialPresetId,
  initialAnalysisStrength,
  initialHideEngineHints,
  initialShowCoordinates,
  initialMoveSounds,
  initialDrillSessionSize,
  children,
}: {
  initialTheme: 'light' | 'dark'
  initialPresetId: string
  initialAnalysisStrength: string | undefined
  initialHideEngineHints: boolean
  initialShowCoordinates: boolean
  initialMoveSounds: boolean
  initialDrillSessionSize: SessionSize
  children: React.ReactNode
}) {
  const [theme, setThemeState] = useState(initialTheme)
  const [moveSounds, setMoveSoundsState] = useState(initialMoveSounds)
  const [drillSessionSize, setDrillSessionSizeState] = useState(initialDrillSessionSize)
  const [showCoordinates, setShowCoordinatesState] = useState(initialShowCoordinates)
  const [hideEngineHints, setHideEngineHintsState] = useState(initialHideEngineHints)
  const [presetId, setPresetId] = useState(initialPresetId)
  const [analysisStrength, setAnalysisStrengthState] = useState<AnalysisStrength>(
    initialAnalysisStrength && initialAnalysisStrength in ANALYSIS_STRENGTHS
      ? (initialAnalysisStrength as AnalysisStrength)
      : DEFAULT_ANALYSIS_STRENGTH,
  )
  const preset = getBoardColorPreset(presetId)

  // The `dark` class lives on <html>, outside this provider.
  function setTheme(next: 'light' | 'dark') {
    setThemeState(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    setCookie(THEME_COOKIE, next)
  }

  function setBoardColorPreset(id: string) {
    setPresetId(id)
    setCookie(BOARD_COLOR_COOKIE, id)
    // --color-accent is used via Tailwind classes, so set it on <html> directly.
    document.documentElement.style.setProperty('--color-accent', getBoardColorPreset(id).dark)
  }

  function setAnalysisStrength(strength: AnalysisStrength) {
    setAnalysisStrengthState(strength)
    setCookie(ANALYSIS_STRENGTH_COOKIE, strength)
  }

  function setHideEngineHints(hide: boolean) {
    setHideEngineHintsState(hide)
    setCookie(HIDE_ENGINE_HINTS_COOKIE, hide ? '1' : '0')
  }

  function setShowCoordinates(show: boolean) {
    setShowCoordinatesState(show)
    setCookie(SHOW_COORDINATES_COOKIE, show ? '1' : '0')
  }

  function setMoveSounds(on: boolean) {
    setMoveSoundsState(on)
    setCookie(MOVE_SOUNDS_COOKIE, on ? '1' : '0')
  }

  // Read server-side by getDrillDeck(); applies from the next /drill load.
  function setDrillSessionSize(size: SessionSize) {
    setDrillSessionSizeState(size)
    setCookie(DRILL_SESSION_SIZE_COOKIE, String(size))
  }

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        presetId: preset.id,
        dark: preset.dark,
        light: preset.light,
        setBoardColorPreset,
        analysisStrength,
        setAnalysisStrength,
        hideEngineHints,
        setHideEngineHints,
        showCoordinates,
        setShowCoordinates,
        moveSounds,
        setMoveSounds,
        drillSessionSize,
        setDrillSessionSize,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

// ponytail: hotlinked from chess.com's CDN rather than redistributed. Needs
// internet; swap in local files under public/sounds/ if they move. A fresh
// Audio per move lets rapid moves overlap.
const SOUND_BASE_URL = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default'

export function playMoveSound(sound: MoveSound) {
  const audio = new Audio(`${SOUND_BASE_URL}/${sound}.mp3`)
  audio.volume = 0.6
  // Autoplay may be blocked before the first user gesture.
  audio.play().catch(() => {})
}

/** Plays a sound when `fen` changes (not on mount); a multi-ply jump plays one. */
export function useMoveSound(fen: string) {
  const { moveSounds } = useSettings()
  const prevFenRef = useRef(fen)
  useEffect(() => {
    const prevFen = prevFenRef.current
    prevFenRef.current = fen
    if (!moveSounds || !fen || !prevFen || prevFen === fen) return
    playMoveSound(moveSoundFor(prevFen, fen))
  }, [fen, moveSounds])
}
