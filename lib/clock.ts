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

/**
 * The share of the starting time the mover had before ply `ply` (1-based): what their clock showed
 * after their previous move, or all of it before their first.
 */
export function clockShareBeforePly(clocks: number[], ply: number, initial: number): number {
  const left = ply > 2 ? clocks[ply - 3] : initial
  return left / initial
}
