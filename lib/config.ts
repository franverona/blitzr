import type { GameSite } from './types'

export function getChesscomUsername(): string {
  const username = process.env.CHESSCOM_USERNAME?.trim()
  if (!username) {
    throw new Error('CHESSCOM_USERNAME is not set. Copy .env.example to .env.local and fill it in.')
  }
  return username
}

export function hasChesscomUsername(): boolean {
  return Boolean(process.env.CHESSCOM_USERNAME?.trim())
}

/** The user's name on `site`, if set. Either site, or both, can be configured. */
export function siteUsername(site: GameSite): string | undefined {
  const raw = site === 'lichess' ? process.env.LICHESS_USERNAME : process.env.CHESSCOM_USERNAME
  return raw?.trim() || undefined
}
