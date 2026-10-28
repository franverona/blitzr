// Imports mate-in-1/2/3 puzzles from Polgár's "5334 Problems, Combinations,
// and Games" (polgar.pgn, Latin-1, in the repo root) into polgar-mates.json in the data
// dir (BLITZR_DATA_DIR, else data/).
// The book is copyrighted, so the output is gitignored: it's for local study,
// and lib/puzzleSet.ts loads it when present (restart the server after).
//
// No PGN? `node scripts/import-polgar-mates.mjs --from-git` rebuilds the file
// from git history instead: the puzzles were in lib/mateProblems.ts until
// they moved out of the repo, so any clone still has them.
//
// Re-running is safe: it rewrites the file, keeping each position's id, so
// solved progress (puzzle_progress, keyed by id) survives. Needs Node 22.18+,
// which runs the imported TypeScript as is.
//
// Candidates are kept only if they replay to checkmate (many records are
// truncated) and, for mate-in-2/3, the mate is forced against every reply.
// That check is slow, so this file doubles as its own worker_threads pool.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { Chess } from 'chess.js'
import { isForcedMate } from '../lib/forcedMate.ts'
import { REAL_GAME_MATES } from '../lib/realGameMates.ts'
import { dataDir } from '../lib/dataDir.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pgnPath = path.join(__dirname, '..', 'polgar.pgn')
const root = path.join(__dirname, '..')
if (fs.existsSync(path.join(root, '.env.local'))) process.loadEnvFile(path.join(root, '.env.local'))
const outPath = path.join(dataDir(root), 'polgar-mates.json')
// The ids right after the 221 real-game puzzles, which is where they started.
const FIRST_ID = 222

const TARGET_CATEGORIES = {
  'Mate in one': 1,
  'Mate in two': 2,
  'Mate in three': 3,
}

// --- Worker branch: validate an assigned chunk, report back, exit ---------

if (!isMainThread) {
  const { chunk } = workerData
  const results = chunk.map(({ fen, mateIn }) => isForcedMate(fen, mateIn))
  parentPort.postMessage(results)
  process.exit(0)
}

function runForcedMateCheckInParallel(items) {
  // Returns results in the same order as `items`.
  if (items.length === 0) return Promise.resolve([])
  const workerCount = Math.max(1, os.cpus().length - 1)
  const chunkSize = Math.ceil(items.length / workerCount)
  const chunks = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }

  return Promise.all(
    chunks.map(
      (chunk) =>
        new Promise((resolve, reject) => {
          const worker = new Worker(new URL(import.meta.url), { workerData: { chunk } })
          worker.on('message', resolve)
          worker.on('error', reject)
        }),
    ),
  ).then((chunkResults) => chunkResults.flat())
}

function formatSolution(moves, sideToMove) {
  const parts = []
  let moveNumber = 1
  for (let i = 0; i < moves.length; i += 2) {
    const isFirstGroup = i === 0
    const solverToMoveIsBlack = sideToMove === 'b'
    const prefix = isFirstGroup && solverToMoveIsBlack ? `${moveNumber}... ` : `${moveNumber}. `
    const group = [moves[i], moves[i + 1]].filter(Boolean).join(' ')
    parts.push(prefix + group)
    moveNumber += 1
  }
  return parts.join(' ')
}

// --- 0. --from-git: restore the last committed copy, then stop ----------

// The last commit on main with the Polgár puzzles inline in lib/mateProblems.ts: the parent of
// #218's squash merge (5f5e862), which moved them out.
const LAST_COMMIT_WITH_POLGAR = 'c6de3b3'

if (process.argv.includes('--from-git')) {
  const source = execFileSync('git', ['show', `${LAST_COMMIT_WITH_POLGAR}:lib/mateProblems.ts`], {
    cwd: path.join(__dirname, '..'),
    maxBuffer: 64 * 1024 * 1024,
  }).toString()
  // Imported from inside the repo so its `chess.js` import resolves.
  const tmp = path.join(path.dirname(outPath), `.polgar-from-git-${process.pid}.ts`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(tmp, source)
  try {
    const { MATE_PROBLEMS } = await import(tmp)
    const polgar = MATE_PROBLEMS.filter((p) => p.composer === 'László Polgár')
    fs.writeFileSync(outPath, JSON.stringify(polgar, null, 2) + '\n')
    console.log(`Restored ${polgar.length} puzzles from ${LAST_COMMIT_WITH_POLGAR} to ${outPath}`)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
  process.exit(0)
}

// --- 1. Read + split ---------------------------------------------------

const raw = fs.readFileSync(pgnPath).toString('latin1')
const records = raw.split(/\n(?=\[Event ")/)

// --- 2. Filter to target categories, extract metadata -------------------

const candidatesByCategory = { 'Mate in one': [], 'Mate in two': [], 'Mate in three': [] }

for (const record of records) {
  const whiteMatch = record.match(/\[White "([^"]+)"\]/)
  if (!whiteMatch || !(whiteMatch[1] in TARGET_CATEGORIES)) continue
  const category = whiteMatch[1]

  const eventMatch = record.match(/\[Event "#(\d+)/)
  const fenMatch = record.match(/\[FEN "([^"]+)"\]/)
  if (!eventMatch || !fenMatch) continue

  candidatesByCategory[category].push({
    bookNumber: Number(eventMatch[1]),
    fen: fenMatch[1],
    record,
  })
}

// --- 3. Dedup against the real-game puzzles; keep ids from a previous run --

const seenFens = new Set(REAL_GAME_MATES.map((p) => p.fen))
const previous = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : []
const idByFen = new Map(previous.map((p) => [p.fen, p.id]))
let nextId = Math.max(FIRST_ID - 1, ...previous.map((p) => p.id)) + 1

// --- 4. Checkmate-replay pass (cheap, serial) -----------------------------

const report = {}
const checkmateVerified = { 'Mate in one': [], 'Mate in two': [], 'Mate in three': [] }

for (const [category, declaredMateIn] of Object.entries(TARGET_CATEGORIES)) {
  const candidates = candidatesByCategory[category]
  let checkmateOk = 0
  let mismatches = 0

  for (const { bookNumber, fen, record } of candidates) {
    if (new Chess(fen).isCheck()) continue

    const chess = new Chess()
    try {
      chess.loadPgn(record, { strict: false })
    } catch {
      continue
    }
    if (!chess.isCheckmate()) continue
    checkmateOk += 1

    const moves = chess.history()
    const mateIn = Math.ceil(moves.length / 2)
    if (mateIn !== declaredMateIn) {
      mismatches += 1
      console.warn(
        `#${bookNumber} (${category}): declared mateIn ${declaredMateIn}, computed ${mateIn}`,
      )
    }

    checkmateVerified[category].push({ bookNumber, fen, moves, mateIn })
  }

  report[category] = { raw: candidates.length, checkmateOk, mismatches }
}

// --- 5. Forced-mate pass (expensive, parallel across CPU cores) ----------

const forcedMateCandidates = [
  ...checkmateVerified['Mate in two'],
  ...checkmateVerified['Mate in three'],
].filter((c) => c.mateIn <= 3)

console.log(
  `Running forced-mate check on ${forcedMateCandidates.length} candidates across ${Math.max(1, os.cpus().length - 1)} workers...`,
)
const forcedResults = await runForcedMateCheckInParallel(
  forcedMateCandidates.map((c) => ({ fen: c.fen, mateIn: c.mateIn })),
)
const forcedByKey = new Map(
  forcedMateCandidates.map((c, i) => [`${c.fen}|${c.mateIn}`, forcedResults[i]]),
)

// --- 6. Dedup + build entries ---------------------------------------------

const newEntries = []

for (const category of Object.keys(TARGET_CATEGORIES)) {
  let forcedOk = 0
  let deduped = 0

  for (const { bookNumber, fen, moves, mateIn } of checkmateVerified[category]) {
    if (mateIn >= 2) {
      if (mateIn > 3) continue
      if (!forcedByKey.get(`${fen}|${mateIn}`)) continue
    }
    forcedOk += 1

    if (seenFens.has(fen)) {
      deduped += 1
      continue
    }
    seenFens.add(fen)

    const sideToMove = fen.split(' ')[1]
    newEntries.push({
      id: idByFen.get(fen) ?? nextId++,
      fen,
      moves,
      mateIn,
      title: `Polgár puzzle #${bookNumber}`,
      composer: 'László Polgár',
      source: '5334 Problems, Combinations, and Games',
      year: '1994',
      solution: formatSolution(moves, sideToMove),
    })
  }

  report[category].forcedOk = forcedOk
  report[category].deduped = deduped
  report[category].imported = forcedOk - deduped
}

// --- 7. Write -------------------------------------------------------------

newEntries.sort((a, b) => a.id - b.id)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(newEntries, null, 2) + '\n')

// --- 8. Report -------------------------------------------------------------

console.log('')
for (const [category, stats] of Object.entries(report)) {
  console.log(
    `${category}: raw=${stats.raw} checkmate-ok=${stats.checkmateOk} forced-ok=${stats.forcedOk} deduped=${stats.deduped} imported=${stats.imported} mismatches=${stats.mismatches}`,
  )
}
console.log(
  `\nTotal imported: ${newEntries.length} (ids ${newEntries[0]?.id}..${
    newEntries[newEntries.length - 1]?.id
  })`,
)
