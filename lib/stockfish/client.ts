import type { PositionEval } from '../types'

// The "lite single-threaded" build — no COOP/COEP headers required, unlike
// the multi-threaded build, and fast enough for on-demand per-game analysis.
// Copied into public/ at install time by scripts/setup-stockfish.js.
const ENGINE_URL = '/stockfish/stockfish-18-lite-single.js'

function isWhiteToMove(fen: string): boolean {
  return fen.split(' ')[1] === 'w'
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
      let latest: PositionEval = { cp: 0, mate: null }

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

        if (line.startsWith('bestmove')) {
          this.worker.removeEventListener('message', onMessage)
          resolve(latest)
        }
      }

      this.worker.addEventListener('message', onMessage)
      this.worker.postMessage(`position fen ${fen}`)
      this.worker.postMessage(`go movetime ${movetimeMs}`)
    })
  }

  terminate(): void {
    this.worker.terminate()
  }
}
