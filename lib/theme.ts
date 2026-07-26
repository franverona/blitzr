// Single source of truth for color values that can't be expressed as a
// Tailwind class — react-chessboard's `darkSquareStyle`/`lightSquareStyle`/
// notation-color options and its `arrows` list all take plain CSS color
// strings, not classNames. The board green/light-square pair and the
// reveal-arrow amber were previously copy-pasted as raw literals across
// every board-rendering component; `--color-accent` in app/globals.css is
// the Tailwind-class equivalent of BOARD_DARK_SQUARE for everywhere a
// className can reach instead (e.g. `bg-accent/20` for the active-tab tint).

/** The board's dark-square color — also the app's brand/accent green,
 *  exposed as the `accent` Tailwind theme color (`app/globals.css`) for
 *  anywhere a className can reach instead of an inline style. */
export const BOARD_DARK_SQUARE = '#769656'

export const BOARD_LIGHT_SQUARE = '#eeeed2'

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
