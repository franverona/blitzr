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
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const MOVETIME_MS = Number(process.argv[2]) || 200
const ENGINES = Math.max(1, os.cpus().length - 1)

const puzzlesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'lichessDefenses.json',
)
const puzzles = JSON.parse(fs.readFileSync(puzzlesPath, 'utf8'))

function startEngine() {
  const proc = spawn('stockfish')
  const lines = readline.createInterface({ input: proc.stdout })
  let onLine = () => {}
  lines.on('line', (line) => onLine(line))
  proc.stdin.write('setoption name Threads value 1\nsetoption name Hash value 64\n')
  return {
    /** Mate distance for the side to move (negative: it gets mated), or null when there's none. */
    mateScore(fen, movetime) {
      return new Promise((resolve) => {
        let mate = null
        onLine = (line) => {
          if (line.startsWith('info') && line.includes(' score ')) {
            const m = line.match(/ score mate (-?\d+)/)
            mate = m ? Number(m[1]) : null
          } else if (line.startsWith('bestmove')) {
            resolve(mate)
          }
        }
        proc.stdin.write(`position fen ${fen}\ngo movetime ${movetime}\n`)
      })
    },
    quit: () => proc.stdin.end('quit\n'),
  }
}

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

/** Searches each job, `ENGINES` at a time; sets `job.mate`. */
async function search(list, movetime) {
  let next = 0
  let done = 0
  await Promise.all(
    Array.from({ length: ENGINES }, async () => {
      const engine = startEngine()
      while (next < list.length) {
        const job = list[next++]
        // Checkmated or stalemated attacker: no mate to find, and the engine has no move.
        job.mate = job.over ? null : await engine.mateScore(job.fen, movetime)
        if (++done % 1000 === 0) console.error(`${done}/${list.length}`)
      }
      engine.quit()
    }),
  )
}

const verdict = (job) => {
  const mates = job.mate !== null && job.mate > 0
  const listed = job.puzzle.saves.includes(job.san)
  if (listed && mates && job.mate <= job.puzzle.mateIn) return 'wrong'
  if (!listed && !(mates && job.mate <= job.puzzle.mateIn)) return 'missing'
  if (listed && mates) return 'delays'
  return null
}

console.error(`${jobs.length} positions, ${ENGINES} engines, ${MOVETIME_MS}ms each`)
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
