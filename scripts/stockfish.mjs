// Native Stockfish (`brew install stockfish`) for the defence-puzzle scripts.
import { spawn } from 'node:child_process'
import os from 'node:os'
import readline from 'node:readline'

function startEngine() {
  const proc = spawn('stockfish')
  const lines = readline.createInterface({ input: proc.stdout })
  let onLine = () => {}
  lines.on('line', (line) => onLine(line))
  proc.stdin.write('setoption name Threads value 1\nsetoption name Hash value 64\n')
  return {
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

/**
 * Mate distance for the side to move in each FEN (negative: it gets mated),
 * or null when Stockfish finds none. Pass null for a finished game.
 */
export async function mateScores(fens, movetime, onProgress = () => {}) {
  const results = new Array(fens.length)
  let next = 0
  let done = 0
  await Promise.all(
    Array.from({ length: Math.max(1, os.cpus().length - 1) }, async () => {
      const engine = startEngine()
      while (next < fens.length) {
        const i = next++
        results[i] = fens[i] === null ? null : await engine.mateScore(fens[i], movetime)
        onProgress(++done, fens.length)
      }
      engine.quit()
    }),
  )
  return results
}
