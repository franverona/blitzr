// Picks mate-in-1/2/3 puzzles from the Lichess puzzle database (CC0,
// https://database.lichess.org/#puzzles) into lib/lichessMates.json:
//
//   curl -s https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc |
//     node scripts/import-lichess-mates.mjs
//
// Re-running is safe: it rewrites the file, and a puzzle already in it keeps
// its id, so solved progress (puzzle_progress, keyed by id) survives.
// Needs Node 22.18+, which runs the imported TypeScript as is.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { Chess } from 'chess.js'
import { isForcedMate } from '../lib/forcedMate.ts'

// A mate-in-3 check takes ~2s, so this file doubles as its own worker pool.
if (!isMainThread) {
  parentPort.postMessage(workerData.map(({ fen, mateIn }) => isForcedMate(fen, mateIn)))
  process.exit(0)
}

/** isForcedMate() for each item, in order, across the CPU cores. */
async function forcedMateInParallel(items) {
  // Small chunks from a shared queue: check times vary a lot, so equal splits leave cores idle.
  const CHUNK = 20
  const results = []
  let next = 0
  async function drain() {
    while (next < items.length) {
      const start = next
      next += CHUNK
      results[start / CHUNK] = await new Promise((resolve, reject) => {
        const worker = new Worker(new URL(import.meta.url), {
          workerData: items.slice(start, start + CHUNK),
        })
        worker.on('message', resolve)
        worker.on('error', reject)
      })
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, os.cpus().length - 1) }, drain))
  return results.flat()
}

const QUOTA = { 1: 600, 2: 900, 3: 500 }
// Well-liked, much-played puzzles with a settled rating.
const MIN_POPULARITY = 90
const MIN_PLAYS = 1000
const MAX_RATING_DEVIATION = 80
// Ids from here up, clear of the real-game (1-221) and local Polgár (222-2427) ones.
const FIRST_ID = 10001

const outPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'lichessMates.json',
)

const candidates = { 1: [], 2: [], 3: [] }
const input = process.argv[2] ? fs.createReadStream(process.argv[2]) : process.stdin
for await (const line of readline.createInterface({ input })) {
  // No field holds a comma: themes and opening tags are space-separated.
  const [puzzleId, fen, moves, rating, deviation, popularity, plays, themes] = line.split(',')
  const mateIn = themes?.match(/\bmateIn([123])\b/)?.[1]
  if (!mateIn) continue
  if (+popularity < MIN_POPULARITY || +plays < MIN_PLAYS || +deviation > MAX_RATING_DEVIATION) {
    continue
  }
  candidates[mateIn].push({ puzzleId, fen, uci: moves.split(' '), rating: +rating })
}

/** `count` items spread evenly over `items` (sorted by rating, so easy to hard). */
function spread(items, count) {
  if (items.length <= count) return items
  return Array.from({ length: count }, (_, i) => items[Math.floor((i * items.length) / count)])
}

/** The puzzle as shown to the solver, or null if a cheap check fails (forced mate comes later). */
function toProblem(c, mateIn) {
  const chess = new Chess(c.fen)
  const play = (uci) =>
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  try {
    // The FEN is before the opponent's last move; the solver starts after it.
    play(c.uci[0])
    const fen = chess.fen()
    const moves = []
    for (const uci of c.uci.slice(1)) {
      // Before the final move: exactly one move must mate, or a different
      // mate would be marked wrong (the board only accepts the listed line).
      if (moves.length === c.uci.length - 2) {
        const mates = chess.moves().filter((san) => {
          chess.move(san)
          const mate = chess.isCheckmate()
          chess.undo()
          return mate
        })
        if (mates.length !== 1) return null
      }
      moves.push(play(uci).san)
    }
    if (!chess.isCheckmate() || Math.ceil(moves.length / 2) !== mateIn) return null
    return { fen, moves }
  } catch {
    return null
  }
}

function formatSolution(moves, sideToMove) {
  const parts = []
  moves.forEach((san, i) => {
    const moveNumber = Math.floor(i / 2) + 1
    if (i === 0)
      parts.push(sideToMove === 'b' ? `${moveNumber}... ${san}` : `${moveNumber}. ${san}`)
    else if ((i % 2 === 0) === (sideToMove === 'w')) parts.push(`${moveNumber}. ${san}`)
    else parts.push(san)
  })
  return parts.join(' ')
}

const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : []
const idByPuzzleId = new Map(existing.map((p) => [p.url.split('/').at(-1), p.id]))
let nextId = Math.max(FIRST_ID - 1, ...existing.map((p) => p.id)) + 1

const problems = []
for (const mateIn of [1, 2, 3]) {
  const sorted = candidates[mateIn].sort((a, b) => a.rating - b.rating)
  // Twice the quota, since some fail the checks; then thin back to the quota.
  let valid = spread(sorted, QUOTA[mateIn] * 2)
    .map((c) => ({ c, problem: toProblem(c, mateIn) }))
    .filter((x) => x.problem)
  if (mateIn > 1) {
    // Also what the tests re-check on a sample, so a puzzle that only times out
    // the search would fail them at random.
    const forced = await forcedMateInParallel(valid.map((x) => ({ fen: x.problem.fen, mateIn })))
    valid = valid.filter((_, i) => forced[i])
  }
  for (const { c, problem } of spread(valid, QUOTA[mateIn])) {
    problems.push({
      id: idByPuzzleId.get(c.puzzleId) ?? nextId++,
      fen: problem.fen,
      moves: problem.moves,
      mateIn,
      title: `Lichess puzzle ${c.puzzleId}`,
      composer: '',
      source: 'Lichess',
      year: '',
      solution: formatSolution(problem.moves, problem.fen.split(' ')[1]),
      rating: c.rating,
      url: `https://lichess.org/training/${c.puzzleId}`,
    })
  }
  console.log(
    `mate in ${mateIn}: ${candidates[mateIn].length} candidates, ${valid.length} checked, kept ${problems.filter((p) => p.mateIn === mateIn).length}`,
  )
}

fs.writeFileSync(outPath, JSON.stringify(problems) + '\n')
console.log(`Wrote ${problems.length} puzzles to ${path.relative(process.cwd(), outPath)}`)
