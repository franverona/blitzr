// Single source of truth for color values that can't be expressed as a
// Tailwind class — react-chessboard's `darkSquareStyle`/`lightSquareStyle`/
// notation-color options and its `arrows` list all take plain CSS color
// strings, not classNames. The board green/light-square pair and the
// reveal-arrow amber were previously copy-pasted as raw literals across
// every board-rendering component; `--color-accent` in app/globals.css is
// the Tailwind-class equivalent of the board's dark-square color for
// everywhere a className can reach instead (e.g. `bg-accent/20` for the
// active-tab tint).

/** A handful of chess.com-style presets — no free-form picker, so there's
 *  always a small, known set of colors to resolve server-side (see
 *  `getBoardColorPreset()` below) rather than an arbitrary stored string. */
export interface BoardColorPreset {
  id: 'green' | 'brown' | 'blue' | 'purple'
  dark: string
  light: string
}

export const BOARD_COLOR_PRESETS: BoardColorPreset[] = [
  { id: 'green', dark: '#769656', light: '#eeeed2' },
  { id: 'brown', dark: '#b58863', light: '#f0d9b5' },
  { id: 'blue', dark: '#6e9ac2', light: '#dbe6f0' },
  { id: 'purple', dark: '#8877b3', light: '#e6e1f5' },
]

/** Looks up a preset by id, falling back to the default (green) for a
 *  missing/stale/tampered cookie value — shared by `app/layout.tsx` (server,
 *  resolving the cookie before first paint) and `BoardColorsProvider`
 *  (client, resolving the same cookie value passed down as its initial
 *  prop), so the two can never disagree about what an id means. */
export function getBoardColorPreset(id: string | undefined): BoardColorPreset {
  return BOARD_COLOR_PRESETS.find((preset) => preset.id === id) ?? BOARD_COLOR_PRESETS[0]
}

/** react-chessboard's coordinate labels default to a same-theme brown/tan
 *  pair (its own default light/dark square colors) rather than an actual
 *  color swap, so on a non-default board they'd render low-contrast.
 *  Swapping each square's label to the *other* square's background color
 *  keeps them legible, and bold keeps them readable at a glance. Every board
 *  with `showNotation: true` (`Board.tsx`, `DrillSession.tsx`,
 *  `LessonQuiz.tsx`, `RepertoireBoard.tsx`, `PlanBoard.tsx`) shares these,
 *  via `useBoardColors()` (`components/BoardColorsProvider.tsx`). */
export function boardNotationStyles(dark: string, light: string) {
  return {
    darkSquareNotationStyle: { color: light, fontWeight: 'bold' as const },
    lightSquareNotationStyle: { color: dark, fontWeight: 'bold' as const },
  }
}

/** The letter/number glyphs render in their own nested span with their own
 *  inline `fontSize` (react-chessboard's `alphaNotationStyle`/
 *  `numericNotationStyle`, default 13px) — that inline style wins over
 *  whatever `fontSize` is set on the outer square span above (`
 *  darkSquareNotationStyle`/`lightSquareNotationStyle`), so sizing has to go
 *  through these two props instead. Pass to both on every board above. */
export const BOARD_NOTATION_SIZE_STYLE = { fontSize: '15px' }

/** Used for every "here's the move" reveal arrow in the app — the engine's
 *  suggested move, Drill's hint, the Learn quiz's "Show move" hint. */
export const REVEAL_ARROW_COLOR = 'rgba(234, 179, 8, 0.9)'

/** react-chessboard's `animationDurationInMs`, shorter than its own 300ms
 *  default — react-chessboard doesn't remove a captured piece from its
 *  render until the slide animation finishes, so for the full duration the
 *  captured piece and the piece capturing it are both visibly rendered on
 *  the same square. No other prop removes that overlap; this just shrinks
 *  how long it's visible. Every board in the app shares this value so
 *  captures read consistently everywhere, and `Board.tsx`'s arrow-key
 *  throttle matches it so a new step never cuts an in-flight slide short. */
export const BOARD_ANIMATION_DURATION_MS = 150

/** Board markers for `PositionChecklist` findings (hanging piece/fork/pin/
 *  skewer squares and arrows) — rose, matching `BlunderSeverityBadge`'s
 *  existing "danger" rose already used for the Blunder severity pill, so the
 *  color reads consistently as "something's at risk" everywhere in the app.
 *  Deliberately not the same hue as `REVEAL_ARROW_COLOR` (the engine's
 *  suggested-move arrow) — both can be on screen at once, and reusing one
 *  color for two different meanings would make them hard to tell apart. */
export const CHECKLIST_ARROW_COLOR = 'rgba(244, 63, 94, 0.9)'
export const CHECKLIST_SQUARE_COLOR = 'rgba(244, 63, 94, 0.35)'
