import { Chess } from 'chess.js'
import type { BestMove, EngineLine, PositionEval } from '../types'

// "Lite single-threaded" build: no COOP/COEP headers needed. Copied into
// public/ by scripts/setup-stockfish.mjs.
const ENGINE_URL = '/stockfish/stockfish-19-lite-single.js'

// Plies of the PV kept after the best move itself.
const BEST_LINE_PLIES = 4

function isWhiteToMove(fen: string): boolean {
  return fen.split(' ')[1] === 'w'
}

// UCI long algebraic ("e7e8q") -> from/to squares + SAN.
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

// Stops at the first PV move that doesn't apply to this position.
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

/** Parses a MultiPV transcript into one line per slot, sorted; the last
 *  `info` per slot wins. Split out from `evaluateLines()` for unit testing. */
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
 * UCI wrapper around the Stockfish Worker. Evals are normalized to White's
 * perspective (UCI reports them for the side to move).
 */
export class StockfishEngine {
  private worker: Worker
  private readyPromise: Promise<void>
  // Rejects if the Worker errors (missing engine script, WASM crash). Every
  // wait races against it so a dead Worker can't hang callers forever.
  private failure: Promise<never>

  constructor() {
    this.worker = new Worker(ENGINE_URL)
    this.failure = new Promise((_, reject) => {
      this.worker.addEventListener(
        'error',
        (event) =>
          reject(
            new Error(
              `Stockfish engine failed${event instanceof ErrorEvent && event.message ? `: ${event.message}` : ` to load (${ENGINE_URL})`}`,
            ),
          ),
        { once: true },
      )
    })
    // Avoid an unhandled rejection when nobody is waiting.
    this.failure.catch(() => {})
    this.readyPromise = Promise.race([this.handshake(), this.failure])
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

    const result = new Promise<PositionEval>((resolve) => {
      let latest: Omit<PositionEval, 'bestMove'> = { cp: 0, mate: null }
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

        // `pv` is always last on an info line; `\b` avoids matching `multipv`.
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
    return Promise.race([result, this.failure])
  }

  /**
   * Top `multiPv` lines for the live panel. MultiPV is set before every
   * search; each caller owns its own engine, so there's no state to clash.
   */
  async evaluateLines(fen: string, multiPv: number, movetimeMs = 500): Promise<EngineLine[]> {
    await this.readyPromise

    const result = new Promise<EngineLine[]>((resolve) => {
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
    return Promise.race([result, this.failure])
  }

  terminate(): void {
    this.worker.terminate()
  }
}
