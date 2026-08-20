import { Chess } from 'chess.js'
import type { BestMove, EngineLine, PositionEval } from '../types'

// The "lite single-threaded" build — no COOP/COEP headers required, unlike
// the multi-threaded build, and fast enough for on-demand per-game analysis.
// Copied into public/ at install time by scripts/setup-stockfish.js.
const ENGINE_URL = '/stockfish/stockfish-18-lite-single.js'

// How many plies of the engine's expected continuation to keep beyond the
// best move itself — enough to convey the idea (two replies each) without
// turning a short callout into a full analysis line.
const BEST_LINE_PLIES = 4

function isWhiteToMove(fen: string): boolean {
  return fen.split(' ')[1] === 'w'
}

// UCI moves are long algebraic ("e2e4", "e7e8q" for promotion) — keep the
// from/to squares for drawing a board arrow, and also convert to SAN ("e4",
// "e8=Q") for display in text (blunder lists, etc). Doesn't attach a
// `bestLine` itself (see parseBestLine below) — callers combine both.
export function parseBestMove(fen: string, uciMove: string): Omit<BestMove, 'bestLine'> | null {
  if (uciMove === '(none)') return null
  const chess = new Chess(fen)
  const from = uciMove.slice(0, 2)
  const to = uciMove.slice(2, 4)
  try {
    const move = chess.move({ from, to, promotion: uciMove.length > 4 ? uciMove[4] : undefined })
    return { from, to, san: move.san }
  } catch {
    return null
  }
}

// The engine's principal variation (its expected continuation for both
// sides) — replayed from `fen` into SAN, stopping at the first move that
// doesn't apply cleanly (a PV can occasionally include a move that's only
// valid deeper in the search, not the position actually reached here).
export function parseBestLine(fen: string, pvUci: string[]): string[] {
  const chess = new Chess(fen)
  const sanMoves: string[] = []
  for (const uciMove of pvUci) {
    const from = uciMove.slice(0, 2)
    const to = uciMove.slice(2, 4)
    try {
      const move = chess.move({ from, to, promotion: uciMove.length > 4 ? uciMove[4] : undefined })
      sanMoves.push(move.san)
    } catch {
      break
    }
  }
  return sanMoves
}

/** Parses a full transcript of `info`/`bestmove` lines from a MultiPV search
 *  into one `EngineLine` per requested PV slot, sorted 1..N — each `info`
 *  line for a given `multipv N` updates that slot, last one before
 *  `bestmove` wins, same rule `evaluate()` applies to its single line. Pure
 *  and Worker-free, unlike `evaluateLines()` itself, so this (not the
 *  Worker-driving method) is what's actually unit-tested — same split as
 *  `parseBestMove`/`parseBestLine` above. */
export function parseMultiPvOutput(fen: string, uciLines: string[]): EngineLine[] {
  const whiteToMove = isWhiteToMove(fen)
  const slots = new Map<number, { cp: number | null; mate: number | null; pv: string[] }>()

  for (const line of uciLines) {
    const multipvMatch = line.match(/\bmultipv (\d+)\b/)
    const mateMatch = line.match(/score mate (-?\d+)/)
    const cpMatch = line.match(/score cp (-?\d+)/)
    const pvMatch = line.match(/\bpv\b (.+)$/)
    if (!mateMatch && !cpMatch && !pvMatch) continue

    const idx = multipvMatch ? Number(multipvMatch[1]) : 1
    const slot = slots.get(idx) ?? { cp: null, mate: null, pv: [] }
    if (mateMatch) {
      const mate = Number(mateMatch[1])
      slot.mate = whiteToMove ? mate : -mate
      slot.cp = null
    } else if (cpMatch) {
      const cp = Number(cpMatch[1])
      slot.cp = whiteToMove ? cp : -cp
      slot.mate = null
    }
    if (pvMatch) slot.pv = pvMatch[1].trim().split(/\s+/)
    slots.set(idx, slot)
  }

  const result: EngineLine[] = []
  for (const idx of [...slots.keys()].sort((a, b) => a - b)) {
    const slot = slots.get(idx)!
    if (slot.pv.length === 0) continue
    const move = parseBestMove(fen, slot.pv[0])
    if (!move) continue
    result.push({
      cp: slot.cp,
      mate: slot.mate,
      move: { ...move, bestLine: parseBestLine(fen, slot.pv).slice(1, 1 + BEST_LINE_PLIES) },
    })
  }
  return result
}

/**
 * Thin wrapper around the Stockfish Web Worker's UCI text protocol. Always
 * returns evals from White's perspective — UCI itself reports "score cp/mate"
 * relative to whoever is to move in the given position, which callers would
 * otherwise have to un-flip themselves.
 */
export class StockfishEngine {
  private worker: Worker
  private readyPromise: Promise<void>

  constructor() {
    this.worker = new Worker(ENGINE_URL)
    this.readyPromise = this.handshake()
  }

  private handshake(): Promise<void> {
    return new Promise((resolve) => {
      const onMessage = (event: MessageEvent<string>) => {
        if (event.data === 'uciok') {
          this.worker.postMessage('isready')
        } else if (event.data === 'readyok') {
          this.worker.removeEventListener('message', onMessage)
          resolve()
        }
      }
      this.worker.addEventListener('message', onMessage)
      this.worker.postMessage('uci')
    })
  }

  async evaluate(fen: string, movetimeMs = 300): Promise<PositionEval> {
    await this.readyPromise
    const whiteToMove = isWhiteToMove(fen)

    return new Promise((resolve) => {
      let latest: Omit<PositionEval, 'bestMove'> = { cp: 0, mate: null }
      // Each deeper "info" line's `pv` replaces the last — by the time
      // "bestmove" arrives, this is the final (deepest-searched) line.
      let latestPv: string[] = []

      const onMessage = (event: MessageEvent<string>) => {
        const line = event.data
        const mateMatch = line.match(/score mate (-?\d+)/)
        const cpMatch = line.match(/score cp (-?\d+)/)

        if (mateMatch) {
          const mate = Number(mateMatch[1])
          latest = { cp: null, mate: whiteToMove ? mate : -mate }
        } else if (cpMatch) {
          const cp = Number(cpMatch[1])
          latest = { cp: whiteToMove ? cp : -cp, mate: null }
        }

        // UCI always puts "pv" last on an info line, so the rest of the
        // line is the space-separated move list — `\bpv\b` (not `multipv`).
        const pvMatch = line.match(/\bpv\b (.+)$/)
        if (pvMatch) latestPv = pvMatch[1].trim().split(/\s+/)

        const bestMoveMatch = line.match(/^bestmove (\S+)/)
        if (bestMoveMatch) {
          this.worker.removeEventListener('message', onMessage)
          const bestMove = parseBestMove(fen, bestMoveMatch[1])
          resolve({
            ...latest,
            bestMove: bestMove
              ? {
                  ...bestMove,
                  bestLine: parseBestLine(fen, latestPv).slice(1, 1 + BEST_LINE_PLIES),
                }
              : null,
          })
        }
      }

      this.worker.addEventListener('message', onMessage)
      this.worker.postMessage(`position fen ${fen}`)
      this.worker.postMessage(`go movetime ${movetimeMs}`)
    })
  }

  /**
   * Like `evaluate()`, but asks for the top `multiPv` candidate lines
   * instead of just one — the "here are 3 winning variants" view a live
   * analysis panel needs (`LiveAnalysisPanel.tsx`), vs. `evaluate()`'s
   * single line, which is all bulk per-game blunder-finding needs. Sets the
   * engine's MultiPV option before every search rather than tracking
   * whether it's already at the right value — cheap to resend, and this
   * method is never interleaved with `evaluate()` calls on the same engine
   * instance (each caller owns its own `StockfishEngine`), so there's
   * nothing to leave in a stale state for another caller to trip over.
   */
  async evaluateLines(fen: string, multiPv: number, movetimeMs = 500): Promise<EngineLine[]> {
    await this.readyPromise

    return new Promise((resolve) => {
      const transcript: string[] = []

      const onMessage = (event: MessageEvent<string>) => {
        transcript.push(event.data)
        if (event.data.startsWith('bestmove')) {
          this.worker.removeEventListener('message', onMessage)
          resolve(parseMultiPvOutput(fen, transcript))
        }
      }

      this.worker.addEventListener('message', onMessage)
      this.worker.postMessage(`setoption name MultiPV value ${multiPv}`)
      this.worker.postMessage(`position fen ${fen}`)
      this.worker.postMessage(`go movetime ${movetimeMs}`)
    })
  }

  terminate(): void {
    this.worker.terminate()
  }
}
