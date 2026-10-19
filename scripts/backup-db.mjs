// `pnpm backup`: copies data/blitzr.db into data/backups/ with SQLite's online
// backup API, so it's consistent even while Blitzr is running.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const src = path.join(dataDir, 'blitzr.db')
if (!fs.existsSync(src)) {
  console.error('No database at data/blitzr.db, nothing to back up.')
  process.exit(1)
}

const destDir = path.join(dataDir, 'backups')
fs.mkdirSync(destDir, { recursive: true })
const dest = path.join(destDir, `blitzr-${new Date().toISOString().replace(/[:.]/g, '-')}.db`)

const db = new Database(src, { readonly: true, fileMustExist: true })
await db.backup(dest)
db.close()
console.log(`Backed up to ${path.relative(process.cwd(), dest)}`)
