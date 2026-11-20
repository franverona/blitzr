import fs from 'node:fs/promises'
import path from 'node:path'

// The name Chess.com's games archive gives a download, so other PGNs in the folder are left alone.
const EXPORT_FILE = /^chess_com_games_.*\.pgn$/

/** The Chess.com exports in `BLITZR_PGN_INBOX`, or none when it isn't set. */
export async function listInboxFiles(): Promise<string[]> {
  const dir = process.env.BLITZR_PGN_INBOX
  if (!dir) return []
  const names = await fs.readdir(dir)
  return names
    .filter((name) => EXPORT_FILE.test(name))
    .sort()
    .map((name) => path.join(dir, name))
}

/** A multi-game PGN file's games, split where each one's `[Event` header starts. */
export function splitPgnGames(text: string): string[] {
  return text
    .split(/\r?\n(?=\[Event )/)
    .map((pgn) => pgn.trim())
    .filter(Boolean)
}
