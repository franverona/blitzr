// Copies the Stockfish files into public/ (gitignored, ~7MB): Workers need a
// real URL, not a bundled module.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FILES = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']
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
