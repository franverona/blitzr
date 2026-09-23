// One-shot import of the composed "mate in one/two/three" puzzles from
// László Polgár's "5334 Problems, Combinations, and Games" PGN compilation
// (polgar.pgn, repo root, Latin-1) into lib/mateProblems.ts's MATE_PROBLEMS
// array. Not meant to be re-run — running it twice would duplicate entries;
// it was run once to produce the appended data and can be deleted or kept
// only for reference/reproducibility.
//
// Every candidate is replayed through chess.js and only kept if it (a)
// actually ends in checkmate — a large fraction of this file's "Mate in two"
// records are transcription-truncated (e.g. the entire "solution" is just
// "1.Bc5+ *", cut off after one ply) — and (b), for mate-in-2/3, the mate is
// *forced* against every legal opponent reply, verified with the same
// isForcedMate() brute-force search lib/mateProblems.ts exports (copied
// here rather than imported, since this is a plain Node script and that
// module is TypeScript — keep the two in sync by hand if either changes).
//
// The forced-mate check is the expensive step (~2,000 positions, each a
// bounded but non-trivial move-tree search) — measured to take over an hour
// running serially. Positions are independent, so this file doubles as its
// own worker_threads pool: run normally, it's the main script; spawned as a
// Worker (see the isMainThread branch at the bottom), it validates whatever
// chunk of candidates it's handed and reports back. ponytail: this is a
// one-off script, so the pool is the simplest thing that works — no queue,
// no retry, just an even split across `os.cpus().length - 1` workers.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { Chess } from 'chess.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pgnPath = path.join(__dirname, '..', 'polgar.pgn')
const mateProblemsPath = path.join(__dirname, '..', 'lib', 'mateProblems.ts')

const TARGET_CATEGORIES = {
  'Mate in one': 1,
  'Mate in two': 2,
  'Mate in three': 3,
}

// Copy of lib/mateProblems.ts's isForcedMate (including its node-visit
// budget — a dense position can otherwise explode combinatorially; see that
// file's comment) — keep the two in sync by hand if either changes.
const FORCED_MATE_NODE_BUDGET = 3_000

function isForcedMate(fen, mateIn) {
  return canForceMate(new Chess(fen), mateIn, { remaining: FORCED_MATE_NODE_BUDGET })
}

function canForceMate(chess, mateIn, budget) {
  if (mateIn < 1) return false
  if (budget.remaining <= 0) return false
  budget.remaining -= 1

  for (const solverMove of chess.moves()) {
    chess.move(solverMove)

    if (mateIn === 1) {
      const solved = chess.isCheckmate()
      chess.undo()
      if (solved) return true
      continue
    }
    if (chess.isCheckmate()) {
      chess.undo()
      continue
    }

    const opponentReplies = chess.moves()
    if (opponentReplies.length === 0) {
      chess.undo()
      continue
    }

    const forced = opponentReplies.every((reply) => {
      chess.move(reply)
      const result = canForceMate(chess, mateIn - 1, budget)
      chess.undo()
      return result
    })
    chess.undo()
    if (forced) return true
    if (budget.remaining <= 0) return false
  }
  return false
}

// --- Worker branch: validate an assigned chunk, report back, exit ---------

if (!isMainThread) {
  const { chunk } = workerData
  const results = chunk.map(({ fen, mateIn }) => isForcedMate(fen, mateIn))
  parentPort.postMessage(results)
  process.exit(0)
}

function runForcedMateCheckInParallel(items) {
  // items: [{ fen, mateIn }]; returns Promise<boolean[]> in the same order.
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

// --- 3. Existing FENs (for dedup) ---------------------------------------

const existingSource = fs.readFileSync(mateProblemsPath, 'utf8')
const seenFens = new Set([...existingSource.matchAll(/fen: '([^']+)'/g)].map((m) => m[1]))
const existingIdMatches = [...existingSource.matchAll(/\n {4}id: (\d+),/g)].map((m) => Number(m[1]))
let nextId = Math.max(...existingIdMatches) + 1

// --- 4. Checkmate-replay pass (cheap, serial) -----------------------------

const report = {}
const checkmateVerified = { 'Mate in one': [], 'Mate in two': [], 'Mate in three': [] }

for (const [category, declaredMateIn] of Object.entries(TARGET_CATEGORIES)) {
  const candidates = candidatesByCategory[category]
  let checkmateOk = 0
  let mismatches = 0

  for (const { bookNumber, fen, record } of candidates) {
    if (new Chess(fen).isCheck()) continue // matches __tests__/mateProblems.test.ts's own invariant

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
      id: nextId++,
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

// --- 7. Emit + splice into lib/mateProblems.ts ---------------------------

function tsString(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function tsEntry(entry) {
  const movesLiteral = `[${entry.moves.map(tsString).join(', ')}]`
  return [
    '  {',
    `    id: ${entry.id},`,
    `    fen: ${tsString(entry.fen)},`,
    `    moves: ${movesLiteral},`,
    `    mateIn: ${entry.mateIn},`,
    `    title: ${tsString(entry.title)},`,
    `    composer: ${tsString(entry.composer)},`,
    `    source: ${tsString(entry.source)},`,
    `    year: ${tsString(entry.year)},`,
    `    solution: ${tsString(entry.solution)},`,
    '  },',
  ].join('\n')
}

const newEntriesText = newEntries.map(tsEntry).join('\n')
const closingBracket = '\n]\n'
const insertAt = existingSource.lastIndexOf(closingBracket)
if (insertAt === -1) {
  throw new Error('Could not find MATE_PROBLEMS closing bracket in lib/mateProblems.ts')
}
const updatedSource =
  existingSource.slice(0, insertAt) +
  '\n' +
  newEntriesText +
  closingBracket +
  existingSource.slice(insertAt + closingBracket.length)

fs.writeFileSync(mateProblemsPath, updatedSource)

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
