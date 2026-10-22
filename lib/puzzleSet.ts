// Server-only: reads the local Polgár file from disk. Client components get a
// puzzle through props instead.
import fs from 'fs'
import path from 'path'
import LICHESS_DEFENSES from './lichessDefenses.json'
import LICHESS_MATES from './lichessMates.json'
import type { MateProblem } from './mateProblems'
import { REAL_GAME_MATES } from './realGameMates'
import { dataDir } from './dataDir'

/** Shipped in the repo: real games plus Lichess (CC0), mates then defences. */
export const BUNDLED_MATES: MateProblem[] = [
  ...REAL_GAME_MATES,
  ...(LICHESS_MATES as MateProblem[]),
  ...(LICHESS_DEFENSES as MateProblem[]),
]

// Polgár's book is copyrighted, so its puzzles stay out of the public repo:
// scripts/import-polgar-mates.mjs writes them here for local study.
const LOCAL_POLGAR_PATH = path.join(dataDir(), 'polgar-mates.json')

let cached: MateProblem[] | null = null

/** Every puzzle in display order: real games, local Polgár (if present), Lichess, defences. */
export function allMateProblems(): MateProblem[] {
  if (!cached) {
    cached = [
      ...REAL_GAME_MATES,
      ...readLocalPolgar(),
      ...(LICHESS_MATES as MateProblem[]),
      ...(LICHESS_DEFENSES as MateProblem[]),
    ]
  }
  return cached
}

export function getMateProblem(id: number): MateProblem | undefined {
  return allMateProblems().find((p) => p.id === id)
}

function readLocalPolgar(): MateProblem[] {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_POLGAR_PATH, 'utf8')) as MateProblem[]
  } catch (err) {
    // Missing is the normal case for anyone without the book; anything else is worth a log.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.error(err)
    return []
  }
}
