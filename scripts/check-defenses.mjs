// Re-checks lib/lichessDefenses.json with a native Stockfish, independently of
// lib/forcedMate.ts (which picked the puzzles):
//
//   brew install stockfish
//   node scripts/check-defenses.mjs [movetime-ms]
//
// Every legal move of every puzzle is searched. Reports a listed save that
// Stockfish says still allows mate within `mateIn` (wrong), an unlisted move
// that doesn't (missing, so the board would reject a good move), and a save
// that only delays mate (delays). Disagreements are re-searched at 5x the
// movetime before being reported.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import { mateScores } from './stockfish.mjs'

const MOVETIME_MS = Number(process.argv[2]) || 200

const puzzlesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'lichessDefenses.json',
)
const puzzles = JSON.parse(fs.readFileSync(puzzlesPath, 'utf8'))

/** Every legal move of every puzzle, with the position after it (attacker to move). */
const jobs = puzzles.flatMap((p) => {
  const chess = new Chess(p.fen)
  return chess.moves().map((san) => {
    chess.move(san)
    const job = { puzzle: p, san, fen: chess.fen(), over: chess.isGameOver() }
    chess.undo()
    return job
  })
})

/** Sets `job.mate` on each job. */
async function search(list, movetime) {
  // A checkmated or stalemated attacker has no mate to find, and the engine has no move.
  const mates = await mateScores(
    list.map((job) => (job.over ? null : job.fen)),
    movetime,
    (done, total) => done % 1000 === 0 && console.error(`${done}/${total}`),
  )
  list.forEach((job, i) => (job.mate = mates[i]))
}

const verdict = (job) => {
  const mates = job.mate !== null && job.mate > 0
  const listed = job.puzzle.saves.includes(job.san)
  if (listed && mates && job.mate <= job.puzzle.mateIn) return 'wrong'
  if (!listed && !(mates && job.mate <= job.puzzle.mateIn)) return 'missing'
  if (listed && mates) return 'delays'
  return null
}

console.error(`${jobs.length} positions, ${MOVETIME_MS}ms each`)
await search(jobs, MOVETIME_MS)
const disputed = jobs.filter((j) => verdict(j) === 'wrong' || verdict(j) === 'missing')
if (disputed.length > 0) {
  console.error(`re-checking ${disputed.length} disagreements at ${MOVETIME_MS * 5}ms`)
  await search(disputed, MOVETIME_MS * 5)
}

const counts = { wrong: 0, missing: 0, delays: 0 }
for (const job of jobs) {
  const v = verdict(job)
  if (!v) continue
  counts[v]++
  console.log(`${v}\t#${job.puzzle.id}\t${job.san}\tmate ${job.mate ?? '-'}`)
}
console.log(
  `${puzzles.length} puzzles, ${jobs.length} moves: ${counts.wrong} wrong, ${counts.missing} missing, ${counts.delays} delays`,
)
