'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  ANALYSIS_STRENGTHS,
  type AnalysisStrength,
  DEFAULT_ANALYSIS_STRENGTH,
} from '@/lib/stockfish/analyze'
import { boardNotationStyles, getBoardColorPreset } from '@/lib/theme'

// Not shared with app/layout.tsx's own read of this same cookie — a plain
// constant exported from a 'use client' module doesn't reliably cross back
// into a Server Component (Next.js treats the whole module as a client
// reference boundary), so the literal is duplicated instead, same as
// Sidebar.tsx's THEME_COOKIE/COLLAPSED_COOKIE already are relative to
// layout.tsx's own inline cookie names.
const BOARD_COLOR_COOKIE = 'blitzr-board-color'
const ANALYSIS_STRENGTH_COOKIE = 'blitzr-analysis-strength'
const HIDE_ENGINE_HINTS_COOKIE = 'blitzr-hide-engine-hints'
const SHOW_COORDINATES_COOKIE = 'blitzr-show-coordinates'
const MOVE_SOUNDS_COOKIE = 'blitzr-move-sounds'

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`
}

interface SettingsContextValue {
  presetId: string
  dark: string
  light: string
  darkSquareNotationStyle: { color: string; fontWeight: 'bold' }
  lightSquareNotationStyle: { color: string; fontWeight: 'bold' }
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
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('Must be used within <SettingsProvider>')
  return ctx
}

// Every per-viewer preference in the Settings dialog, in one provider rather
// than one per setting. Mounted once in the root layout, seeded from the blitzr-board-color cookie
// read server-side there — same zero-flash reasoning as the theme toggle's
// own cookie (app/layout.tsx also bakes the resolved accent color straight
// into <html>'s inline style from that same server read, so there's nothing
// left for the client to visibly correct after hydration). A Context, not
// the localStorage + useSyncExternalStore this used before: board colors
// need to be known *before* first paint (react-chessboard's square colors
// are plain inline-style props, not something a script can patch onto
// already-rendered DOM afterward), which only a server-resolved value can
// guarantee — localStorage can't be read until the client mounts.
export function SettingsProvider({
  initialPresetId,
  initialAnalysisStrength,
  initialHideEngineHints,
  initialShowCoordinates,
  initialMoveSounds,
  children,
}: {
  initialPresetId: string
  initialAnalysisStrength: string | undefined
  initialHideEngineHints: boolean
  initialShowCoordinates: boolean
  initialMoveSounds: boolean
  children: React.ReactNode
}) {
  const [moveSounds, setMoveSoundsState] = useState(initialMoveSounds)
  const [showCoordinates, setShowCoordinatesState] = useState(initialShowCoordinates)
  const [hideEngineHints, setHideEngineHintsState] = useState(initialHideEngineHints)
  const [presetId, setPresetId] = useState(initialPresetId)
  const [analysisStrength, setAnalysisStrengthState] = useState<AnalysisStrength>(
    initialAnalysisStrength && initialAnalysisStrength in ANALYSIS_STRENGTHS
      ? (initialAnalysisStrength as AnalysisStrength)
      : DEFAULT_ANALYSIS_STRENGTH,
  )
  const preset = getBoardColorPreset(presetId)

  function setBoardColorPreset(id: string) {
    setPresetId(id)
    setCookie(BOARD_COLOR_COOKIE, id)
    // --color-accent (app/globals.css) is consumed via a Tailwind class, not
    // a prop this context's value can reach — kept in sync by writing it
    // directly here, same as the initial server-rendered value on <html>.
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

  return (
    <SettingsContext.Provider
      value={{
        presetId: preset.id,
        dark: preset.dark,
        light: preset.light,
        ...boardNotationStyles(preset.dark, preset.light),
        setBoardColorPreset,
        analysisStrength,
        setAnalysisStrength,
        hideEngineHints,
        setHideEngineHints,
        showCoordinates,
        setShowCoordinates,
        moveSounds,
        setMoveSounds,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

let audioContext: AudioContext | null = null

// ponytail: a synthesized blip via Web Audio rather than shipping sound
// files — swap in recorded samples if this ever needs to sound like
// chess.com's. Lower pitch for a capture.
function playMoveSound(capture: boolean) {
  audioContext ??= new AudioContext()
  const t = audioContext.currentTime
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  osc.frequency.value = capture ? 220 : 440
  gain.gain.setValueAtTime(0.2, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  osc.connect(gain).connect(audioContext.destination)
  osc.start(t)
  osc.stop(t + 0.08)
}

function pieceCount(fen: string): number {
  return fen.split(' ')[0].replace(/[^a-z]/gi, '').length
}

/** Plays a move sound whenever `fen` changes (not on mount), if enabled in
 *  Settings — a capture when the new position has fewer pieces. Any position
 *  change counts, so a multi-ply jump plays one sound, not one per ply. */
export function useMoveSound(fen: string) {
  const { moveSounds } = useSettings()
  const prevFenRef = useRef(fen)
  useEffect(() => {
    const prevFen = prevFenRef.current
    prevFenRef.current = fen
    if (!moveSounds || !fen || !prevFen || prevFen === fen) return
    playMoveSound(pieceCount(fen) < pieceCount(prevFen))
  }, [fen, moveSounds])
}
