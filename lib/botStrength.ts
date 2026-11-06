export const BOT_ELOS = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500] as const
export type BotElo = (typeof BOT_ELOS)[number]
export const DEFAULT_BOT_ELO: BotElo = 1200

// Stockfish's UCI_Elo floor; below it only Skill Level can weaken the engine.
const MIN_UCI_ELO = 1320

// shortcut: the Skill Level → Elo mapping is a guess (Stockfish publishes none); recalibrate if
// a level plays clearly off.
const SKILL_LEVELS: Partial<Record<BotElo, number>> = { 800: 0, 1000: 3, 1200: 6 }

export function isBotElo(value: unknown): value is BotElo {
  return BOT_ELOS.includes(value as BotElo)
}

/** Levels under UCI_Elo's floor are approximate, so they're labeled "~800". */
export function isApproximateElo(elo: BotElo): boolean {
  return elo < MIN_UCI_ELO
}

/** `setoption` commands that make Stockfish play at about `elo`. */
export function botUciOptions(elo: BotElo): string[] {
  const skill = SKILL_LEVELS[elo]
  return skill !== undefined
    ? [`setoption name Skill Level value ${skill}`]
    : ['setoption name UCI_LimitStrength value true', `setoption name UCI_Elo value ${elo}`]
}

/** Think time per move; Skill Level picks among weaker moves, so a short search is enough. */
export function botMovetimeMs(elo: BotElo): number {
  return isApproximateElo(elo) ? 100 : 500
}
