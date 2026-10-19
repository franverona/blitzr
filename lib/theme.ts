// Colors react-chessboard needs as plain CSS strings rather than Tailwind
// classes. `--color-accent` in app/globals.css is the class-side equivalent.

export interface BoardColorPreset {
  id: 'green' | 'brown' | 'blue' | 'purple'
  dark: string
  light: string
}

export const BOARD_COLOR_PRESETS: BoardColorPreset[] = [
  { id: 'green', dark: '#769656', light: '#eeeed2' },
  { id: 'brown', dark: '#b58863', light: '#f0d9b5' },
  { id: 'blue', dark: '#80a1b5', light: '#d5e0e6' },
  { id: 'purple', dark: '#8877b3', light: '#e6e1f5' },
]

/** Falls back to green for a missing or invalid cookie value. */
export function getBoardColorPreset(id: string | undefined): BoardColorPreset {
  return BOARD_COLOR_PRESETS.find((preset) => preset.id === id) ?? BOARD_COLOR_PRESETS[0]
}

export const REVEAL_ARROW_COLOR = 'rgba(234, 179, 8, 0.9)'

/** Shorter than react-chessboard's 300ms default: a captured piece stays
 *  visible under its capturer until the slide finishes. */
export const BOARD_ANIMATION_DURATION_MS = 150

/** Rose ("at risk"), distinct from the reveal-arrow amber since both can show. */
export const CHECKLIST_ARROW_COLOR = 'rgba(244, 63, 94, 0.9)'
export const CHECKLIST_SQUARE_COLOR = 'rgba(244, 63, 94, 0.35)'

export const GAME_END_SQUARE_COLORS = {
  loss: CHECKLIST_SQUARE_COLOR,
  flag: CHECKLIST_SQUARE_COLOR,
  win: 'rgba(16, 185, 129, 0.35)',
  draw: 'rgba(161, 161, 170, 0.35)',
}

/** Auto-play step interval (ms). Fast stays above BOARD_ANIMATION_DURATION_MS. */
export const PLAY_SPEEDS = { slow: 1000, normal: 500, fast: 250 } as const
export type PlaySpeed = keyof typeof PLAY_SPEEDS

export function getPlaySpeed(raw: string | undefined): PlaySpeed {
  return raw && raw in PLAY_SPEEDS ? (raw as PlaySpeed) : 'normal'
}
