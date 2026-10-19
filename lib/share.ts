import { Chess } from 'chess.js'

/** PGN for a line from `initialFen`; chess.js adds the FEN/SetUp headers for
 *  a non-standard start. Stops at the first move that doesn't apply. */
export function linePgn(initialFen: string, movesSan: string[]): string {
  const chess = new Chess(initialFen)
  for (const san of movesSan) {
    try {
      chess.move(san)
    } catch {
      break
    }
  }
  return chess.pgn()
}

export function lichessAnalysisUrl(fen: string, color: 'white' | 'black'): string {
  return `https://lichess.org/analysis/${fen.replace(/ /g, '_')}?color=${color}`
}
