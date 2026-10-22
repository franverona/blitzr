import path from 'node:path'

/**
 * Where the database, its backups and local-only puzzles live: `BLITZR_DATA_DIR`, or `data/`.
 * Relative paths resolve against `base` (the app's working directory; scripts pass the repo root).
 * Shared with scripts/, which Node runs as plain TypeScript, so no `@/` imports here.
 */
export function dataDir(base: string = process.cwd()): string {
  return path.resolve(base, process.env.BLITZR_DATA_DIR || 'data')
}
