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
