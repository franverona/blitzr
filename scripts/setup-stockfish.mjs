// Copies the Stockfish WASM engine files into public/ so the browser can load
// them directly as a Worker script (new Worker('/stockfish/...')) — Workers
// need a real URL, not something bundled through webpack/Turbopack. Not
// committed to git (public/stockfish/ is gitignored, like data/*.db) since
// the .wasm binary is ~7MB; this script re-copies it from node_modules on
// every install instead.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FILES = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm']
const srcDir = path.join(__dirname, '..', 'node_modules', 'stockfish', 'bin')
const destDir = path.join(__dirname, '..', 'public', 'stockfish')

if (!fs.existsSync(srcDir)) {
  console.warn('stockfish package not found in node_modules, skipping asset copy.')
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })
for (const file of FILES) {
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
}
console.log(`Copied Stockfish engine files to ${path.relative(process.cwd(), destDir)}/`)
