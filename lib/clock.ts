/** A clocked game's starting time in seconds ("600", "180+2"); null for daily or unknown. */
export function initialClockSeconds(timeControl: string): number | null {
  const base = Number(timeControl.split('+')[0])
  return timeControl && Number.isFinite(base) && base > 0 ? base : null
}

const CLK = /\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/g

/** Seconds left after each ply, from the PGN's `[%clk h:mm:ss]` comments; null unless every ply has one. */
export function plyClocks(pgn: string, plies: number): number[] | null {
  const clocks = [...pgn.matchAll(CLK)].map(
    ([, h, m, s]) => Number(h) * 3600 + Number(m) * 60 + Number(s),
  )
  return plies > 0 && clocks.length === plies ? clocks : null
}

/** A clocked game's increment in seconds ("180+2" → 2), 0 without one. */
export function clockIncrementSeconds(timeControl: string): number {
  const increment = Number(timeControl.split('+')[1] ?? 0)
  return Number.isFinite(increment) && increment > 0 ? increment : 0
}

// A berserked Lichess player starts on exactly half the time, which their first clock shows
// (Lichess doesn't run it on the first move), and loses the increment. A slow first move
// elsewhere isn't a berserk.
function isBerserked(clocks: number[], ply: number, initial: number): boolean {
  return Math.abs(clocks[(ply - 1) % 2] - initial / 2) < 1
}

/**
 * The share of the starting time the mover had before ply `ply` (1-based): what their clock showed
 * after their previous move, or all of it before their first.
 */
export function clockShareBeforePly(clocks: number[], ply: number, initial: number): number {
  const start = isBerserked(clocks, ply, initial) ? initial / 2 : initial
  const left = ply > 2 ? clocks[ply - 3] : start
  return left / start
}

/** Seconds ply `ply` (1-based) took: the mover's clock before it, minus after, plus the increment. */
export function thinkSecondsForPly(
  clocks: number[],
  ply: number,
  initial: number,
  increment: number,
): number {
  const berserked = isBerserked(clocks, ply, initial)
  const before = ply > 2 ? clocks[ply - 3] : berserked ? initial / 2 : initial
  return Math.max(0, before - clocks[ply - 1] + (berserked ? 0 : increment))
}

/** What a move took and the mover's clock after it, for the move list. */
export interface MoveClock {
  spent: number
  left: number
}

/** "2:05", or "1:02:05" from an hour; whole seconds, rounded down like a clock. */
export function formatClock(seconds: number): string {
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const ss = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** A move's think time: "0.4s", "12s", or "1:05" from a minute. */
export function formatThinkTime(seconds: number): string {
  if (seconds >= 60) return formatClock(seconds)
  return `${seconds < 10 ? Number(seconds.toFixed(1)) : Math.round(seconds)}s`
}

/** Every ply's think time and clock, or undefined unless the game is clocked on every ply. */
export function moveClocks(
  pgn: string,
  plies: number,
  timeControl: string,
): MoveClock[] | undefined {
  const initial = initialClockSeconds(timeControl)
  const clocks = initial ? plyClocks(pgn, plies) : null
  if (!initial || !clocks) return undefined
  const increment = clockIncrementSeconds(timeControl)
  return clocks.map((left, i) => ({
    spent: thinkSecondsForPly(clocks, i + 1, initial, increment),
    left,
  }))
}
