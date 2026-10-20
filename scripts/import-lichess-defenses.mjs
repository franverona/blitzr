// Picks "stop the mate" puzzles from the Lichess puzzle database (CC0,
// https://database.lichess.org/#puzzles) into lib/lichessDefenses.json:
//
//   curl -s https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc |
//     node scripts/import-lichess-defenses.mjs
//
// A Lichess mate puzzle starts one move early, before the opponent's mistake
// that allowed the mate. That earlier position, seen from the side that made
// the mistake, is the defence puzzle: kept when the mate was already
// threatened and only one or two moves stop it.
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
import { forcedMateWithin } from '../lib/forcedMate.ts'

// More saving moves than this and the puzzle is too easy to stumble into.
const MAX_SAVES = 2
// Fewer losing moves than this and there's little to find.
const MIN_LOSING_MOVES = 3

/** The moves that stop mate in `mateIn` or fewer, or null if the position doesn't make a puzzle. */
function savingMoves(fen, mateIn) {
  const chess = new Chess(fen)
  // In check, the threat is plain to see; otherwise passing must allow mate, or it isn't a threat.
  if (!chess.isCheck() && forcedMateWithin(passMove(fen), mateIn) !== true) return null
  const saves = []
  let losing = 0
  for (const san of chess.moves()) {
    chess.move(san)
    // A move that only delays mate past `mateIn` counts as a save: checking one move
    // deeper means mate-in-3 searches, which mostly run out of budget.
    const mates = forcedMateWithin(chess.fen(), mateIn)
    chess.undo()
    // Out of budget means unknown, and a losing move must never pass as a save.
    if (mates === undefined) return null
    if (mates) losing++
    else if (saves.push(san) > MAX_SAVES) return null
  }
  return saves.length > 0 && losing >= MIN_LOSING_MOVES ? saves : null
}

/** The same position with the other side to move (only valid when not in check). */
function passMove(fen) {
  const [board, turn, castling] = fen.split(' ')
  return `${board} ${turn === 'w' ? 'b' : 'w'} ${castling} - 0 1`
}

if (!isMainThread) {
  parentPort.postMessage(workerData.map(({ fen, mateIn }) => savingMoves(fen, mateIn)))
  process.exit(0)
}

/** savingMoves() for each item, in order, across the CPU cores. */
async function savingMovesInParallel(items) {
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

const QUOTA = { 1: 500, 2: 500 }
// Most candidates fail the threat or saving-move checks, so check this many times the quota.
const OVERSAMPLE = 25
// Same bar as import-lichess-mates.mjs: well-liked, much-played, settled rating.
const MIN_POPULARITY = 90
const MIN_PLAYS = 1000
const MAX_RATING_DEVIATION = 80
// Ids from here up, clear of the mate puzzles (real games, Polgár, Lichess 10001+).
const FIRST_ID = 20001

const outPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'lichessDefenses.json',
)

const candidates = { 1: [], 2: [] }
const input = process.argv[2] ? fs.createReadStream(process.argv[2]) : process.stdin
for await (const line of readline.createInterface({ input })) {
  // No field holds a comma: themes and opening tags are space-separated.
  const [puzzleId, fen, moves, rating, deviation, popularity, plays, themes] = line.split(',')
  const mateIn = themes?.match(/\bmateIn([12])\b/)?.[1]
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

/** The game's line in SAN (the mistake, then the mate), or null if it doesn't end in mate. */
function gameLine(c, mateIn) {
  const chess = new Chess(c.fen)
  try {
    const moves = c.uci.map(
      (uci) => chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san,
    )
    return chess.isCheckmate() && moves.length === mateIn * 2 ? moves : null
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
for (const mateIn of [1, 2]) {
  const sorted = candidates[mateIn].sort((a, b) => a.rating - b.rating)
  const withLine = spread(sorted, QUOTA[mateIn] * OVERSAMPLE)
    .map((c) => ({ c, moves: gameLine(c, mateIn) }))
    .filter((x) => x.moves)
  const saves = await savingMovesInParallel(withLine.map(({ c }) => ({ fen: c.fen, mateIn })))
  const valid = withLine.map((x, i) => ({ ...x, saves: saves[i] })).filter((x) => x.saves)
  for (const { c, moves, saves } of spread(valid, QUOTA[mateIn])) {
    problems.push({
      id: idByPuzzleId.get(c.puzzleId) ?? nextId++,
      fen: c.fen,
      moves,
      mateIn,
      title: `Lichess puzzle ${c.puzzleId}`,
      composer: '',
      source: 'Lichess',
      year: '',
      solution: formatSolution(moves, c.fen.split(' ')[1]),
      rating: c.rating,
      url: `https://lichess.org/training/${c.puzzleId}`,
      saves,
    })
  }
  console.log(
    `defend mate in ${mateIn}: ${candidates[mateIn].length} candidates, ${withLine.length} checked, ${valid.length} valid, kept ${problems.filter((p) => p.mateIn === mateIn).length}`,
  )
}

fs.writeFileSync(outPath, JSON.stringify(problems, null, 2) + '\n')
console.log(`Wrote ${problems.length} puzzles to ${path.relative(process.cwd(), outPath)}`)
