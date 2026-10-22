// `pnpm backup`: copies blitzr.db into backups/ in the data dir (BLITZR_DATA_DIR, else data/)
// with SQLite's online backup API, so it's consistent even while Blitzr is running.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { dataDir as getDataDir } from '../lib/dataDir.ts'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
// Next reads .env.local for the app; a plain node script has to load it itself.
if (fs.existsSync(path.join(root, '.env.local'))) process.loadEnvFile(path.join(root, '.env.local'))
const dataDir = getDataDir(root)
const src = path.join(dataDir, 'blitzr.db')
if (!fs.existsSync(src)) {
  console.error(`No database at ${src}, nothing to back up.`)
  process.exit(1)
}

const destDir = path.join(dataDir, 'backups')
fs.mkdirSync(destDir, { recursive: true })
const dest = path.join(destDir, `blitzr-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)

const db = new Database(src, { readonly: true, fileMustExist: true })
await db.backup(dest)
db.close()
const relative = path.relative(process.cwd(), dest)
console.log(`Backed up to ${relative.startsWith('..') ? dest : relative}`)
