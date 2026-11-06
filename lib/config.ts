import type { GameSite } from './types'

/** The user's name on `site`, if set. Either site, or both, can be configured. */
export function siteUsername(site: GameSite): string | undefined {
  const raw = site === 'lichess' ? process.env.LICHESS_USERNAME : process.env.CHESSCOM_USERNAME
  return raw?.trim() || undefined
}

/** At least one is needed: without either, the layout shows only the setup screen. */
export function hasAnyUsername(): boolean {
  return Boolean(siteUsername('chesscom') || siteUsername('lichess'))
}
