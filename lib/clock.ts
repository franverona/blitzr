/** A clocked game's starting time in seconds ("600", "180+2"); null for daily or unknown. */
export function initialClockSeconds(timeControl: string): number | null {
  const base = Number(timeControl.split('+')[0])
  return timeControl && Number.isFinite(base) && base > 0 ? base : null
}

const FRACTIONS: Record<number, string> = { 15: '¼', 30: '½', 45: '¾' }

/** "180+2" → "3+2", daily "1/172800" → days(2); null when there's no control to show. */
export function formatTimeControl(timeControl: string, days: (n: number) => string): string | null {
  const daily = timeControl.match(/^1\/(\d+)$/)
  if (daily) return days(Math.max(1, Math.round(Number(daily[1]) / 86400)))
  const base = initialClockSeconds(timeControl)
  if (base == null) return null
  const minutes = FRACTIONS[base] ?? String(Number((base / 60).toFixed(1)))
  return `${minutes}+${clockIncrementSeconds(timeControl)}`
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
  // Lichess neither runs the clock nor adds the increment on a player's first move.
  if (ply <= 2 && clocks[ply - 1] >= before) return 0
  return Math.max(0, before - clocks[ply - 1] + (berserked ? 0 : increment))
}
