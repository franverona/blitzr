// Checks every endgame and position lesson line against the Lichess tablebase (perfect play,
// up to 7 pieces):
//
//   node scripts/check-lessons.mjs [slug...]
//
// Reports a move that changes the result for the side making it: `wrong` for the lesson's own
// side (primaryColor), `defense` for the other one (its replies are one illustrative defense, but
// one that throws a draw or a win makes the line teach the wrong thing). Positions with more than
// 7 pieces are skipped. Needs network; not run in CI.
import { Chess } from 'chess.js'
import { ENDGAME_LESSONS } from '../lib/endgameTheory.ts'
import { POSITION_LESSONS } from '../lib/positionTheory.ts'

const USER_AGENT =
  'Blitzr/0.1 (personal chess repertoire trainer; https://github.com/franverona/blitzr)'

// Side-to-move's view. A cursed win / blessed loss is a 50-move-rule draw.
const RANK = {
  win: 4,
  'maybe-win': 4,
  'cursed-win': 2,
  draw: 2,
  'blessed-loss': 2,
  loss: 0,
  'maybe-loss': 0,
}
const FLIP = {
  win: 'loss',
  'maybe-win': 'maybe-loss',
  'cursed-win': 'blessed-loss',
  draw: 'draw',
  'blessed-loss': 'cursed-win',
  loss: 'win',
  'maybe-loss': 'maybe-win',
}

const pieceCount = (fen) => fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length

async function probe(fen) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(
      `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`,
      { headers: { 'User-Agent': USER_AGENT } },
    )
    if (res.status === 429 && attempt === 0) {
      console.error('429: waiting a minute')
      await new Promise((r) => setTimeout(r, 60_000))
      continue
    }
    if (!res.ok) throw new Error(`tablebase ${res.status} for ${fen}`)
    await new Promise((r) => setTimeout(r, 1000)) // one request a second
    return res.json()
  }
}

/** The result for the side to move after `san`, from the mover's view, and the best available. */
function judge(entry, san) {
  const move = entry.moves.find((m) => m.san === san)
  const played = move ? FLIP[move.category] : undefined
  return { played, best: entry.category }
}

const only = process.argv.slice(2)
const lessons = [...ENDGAME_LESSONS, ...POSITION_LESSONS].filter(
  (l) => only.length === 0 || only.includes(l.slug),
)

const counts = { wrong: 0, defense: 0, skipped: 0, checked: 0 }
for (const lesson of lessons) {
  const chess = new Chess(lesson.initialFen)
  for (const [i, { san }] of lesson.moves.entries()) {
    const fen = chess.fen()
    const mover = chess.turn() === 'w' ? 'white' : 'black'
    chess.move(san)
    if (pieceCount(fen) > 7) {
      counts.skipped++
      continue
    }
    const { played, best } = judge(await probe(fen), san)
    counts.checked++
    if (!(played in RANK) || !(best in RANK) || RANK[played] >= RANK[best]) continue
    const kind = mover === lesson.primaryColor ? 'wrong' : 'defense'
    counts[kind]++
    console.log(`${kind}\t${lesson.slug}\tply ${i + 1} ${san}\t${best} -> ${played}\t${fen}`)
  }
}
console.log(
  `${lessons.length} lessons, ${counts.checked} moves checked, ${counts.skipped} skipped (> 7 pieces): ${counts.wrong} wrong, ${counts.defense} defense`,
)
