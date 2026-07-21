# Blitzr — Claude Code instructions

## What this is

A local, single-user chess repertoire trainer built from the owner's own Chess.com games.
Public, open-source, but scoped for one person running it on their own machine. No accounts,
no hosted version, no multi-user support.

Built in phases; only build what the current phase asks for. Don't scaffold future phases
ahead of time.

- **Phase 1 (done)**: username config, incremental Chess.com sync into SQLite, browse UI
  (game list, board replay, openings aggregated by ECO). No engine.
- **Phase 2**: user-defined repertoire (opening trees per color), diff each game against it to
  flag the first deviating move.
- **Phase 3**: Stockfish (WASM, in a Web Worker) analysis — recurring blunders, biggest eval
  drops.
- **Phase 4**: spaced-repetition drilling of deviation/blunder positions.

## Stack

- **Next.js** App Router with Server Actions (`'use server'` file directive)
- **Pluggable database** behind a `GameRepository` interface (`lib/db/`), selected at runtime
  via `DB_TYPE`. Only `sqlite` (via Kysely + `better-sqlite3`) is implemented — see "Database
  backend" below
- **Tailwind CSS v4**
- **TypeScript**
- **chess.js** for PGN parsing/move validation, **react-chessboard** (v5, `options` prop API)
  for the board UI

## Project structure

```
app/
  actions.ts              # all DB reads + the sync action (Server Actions)
  page.tsx                 # games list (paginated), with the Sync button
  layout.tsx                # nav (Games / Openings)
  globals.css
  games/[id]/page.tsx        # single game — board replay or raw PGN fallback
  openings/page.tsx           # ECO family aggregation, expandable to named lines
components/
  GameList.tsx / GameRow.tsx  # games table
  Board.tsx                    # react-chessboard + ply navigation (client)
  OpeningsTable.tsx              # family/line aggregation table (client, expand/collapse)
  SyncButton.tsx                   # triggers the sync Server Action (client)
lib/
  config.ts                # getChesscomUsername() — reads CHESSCOM_USERNAME
  types.ts                  # domain types: Game, OpeningFamily/Line, ArchiveSyncStatus, SyncResult
  openings.ts                # buildOpeningFamilies() — pure aggregation, unit-tested
  sync.ts                     # syncAllArchives() — orchestrates client + normalize + repo
  chesscom/
    client.ts                  # fetchArchives, fetchArchiveMonth — serial, UA header, 429 backoff
    normalize.ts                 # raw Chess.com game -> Game (result bucketing, my_color, moves_san, eco)
  db/
    index.ts                # barrel: export { getRepository }
    factory.ts                # getRepository() — reads DB_TYPE, dispatches to a backend
    types.ts                   # Kysely DbSchema (snake_case) + GameRepository interface + DbType
    sqlite/
      connection.ts             # better-sqlite3 + Kysely singleton, globalThis-cached
      migrate.ts                  # ensureSchema() — DDL, idempotent
      repository.ts                 # SqliteGameRepository — camelCase Game <-> snake_case row mapping
      index.ts                       # getSqliteRepository(), globalThis-cached
data/
  blitzr.db             # created at runtime, gitignored
```

## Key conventions

- **Server Actions** for all DB reads/writes and the sync trigger — no API routes.
- **Domain types are camelCase** (`lib/types.ts`); **DB columns are snake_case**
  (`lib/db/types.ts`). Each repository implementation maps between them explicitly (see
  `gameToRow`/`rowToGame` in `lib/db/sqlite/repository.ts`) — never leak snake_case past the
  repository layer.
- `better-sqlite3` is excluded from webpack bundling via `serverExternalPackages` in
  `next.config.ts`.
- **Migrations** run idempotently in `ensureSchema()` (`lib/db/sqlite/migrate.ts`) — extend the
  schema with `CREATE TABLE IF NOT EXISTS` / additive `ALTER TABLE ... ADD COLUMN` wrapped in
  try/catch. No migration-version table.
- **Games are immutable once synced**: `upsertGames` uses `ON CONFLICT DO NOTHING`, not an
  update — a finished Chess.com game's data doesn't change, so there's nothing to reconcile on
  re-sync.
- **`moves_san` is a JSON array column, not a moves table** — board replay and (future)
  repertoire diffing both walk the array in application code; nothing needs to query at ply
  granularity in SQL. Revisit only if that changes.
- **Chess.com's per-player `result` string** (`win`/`checkmated`/`resigned`/`agreed`/…) is
  bucketed into `win`/`draw`/`loss` by `normalizeResult()` (`lib/chesscom/normalize.ts`) — see
  that file for the exact draw-outcome set.
- **PGN headers are parsed independently of chess.js** (`parsePgnHeaders` regex in
  `normalize.ts`) so ECO/ECOUrl are still available even for games whose movetext chess.js
  can't validate (e.g. bughouse's piece-drop notation). `movesSan`/`finalFen` are `null` for
  those games; `app/games/[id]/page.tsx` falls back to showing the raw PGN.
- **Openings aggregation is a pure function**, not a repository method:
  `buildOpeningFamilies()` (`lib/openings.ts`) takes `Game[]` and groups by 3-char ECO code
  (family), nesting each family's distinct named lines (from `ecoName`) underneath. Keeps it
  backend-agnostic and directly unit-testable.

## Database backend

- **`DB_TYPE`** env var selects the backend. Defaults to `sqlite` (zero-config). Only `sqlite`
  is implemented; `lib/db/factory.ts` throws a clear error for anything else rather than
  silently falling back.
- **To add a new backend** (e.g. Postgres): implement `GameRepository` (`lib/db/types.ts`) in a
  new `lib/db/<backend>/` directory (mirror `lib/db/sqlite/`), then register it in the
  `switch` in `lib/db/factory.ts`. There's no shared cross-backend SQL layer yet — add one only
  once a second SQL backend actually exists; building it for one implementation is premature.
- SQLite lives at `./data/blitzr.db`, created automatically on first run. To reset, delete the
  file and re-sync.

## Chess.com ingestion

- Base URL `https://api.chess.com/pub`, no API key. Every request sends a descriptive
  `User-Agent` (`lib/chesscom/client.ts`) — Chess.com throttles requests without one.
- Archives are fetched **serially** (a `for` loop with `await`, never `Promise.all`) —
  `lib/sync.ts`'s `syncAllArchives()`. 429s are retried with backoff honoring `Retry-After`
  (`lib/chesscom/client.ts`'s `getJson`).
- **Incremental sync**: `sync_state` tracks each archive month as `complete` or `partial`.
  Months already `complete` are skipped on future runs; the current month is always re-fetched
  (marked `partial`) since it can still gain new games.
- Ingestion is deliberately unfiltered — variants (chess960, bughouse, …) and daily
  (correspondence) games are synced like everything else. Filtering what counts toward the
  user's repertoire is a UI/analysis-layer decision, not an ingestion-time one, so nothing
  synced is ever silently lost.

## Testing

- **Vitest** — run with `pnpm test` (or `pnpm test:watch`)
- Tests live in `__tests__/`: `normalize.test.ts` (result bucketing, ECO name parsing, chess.js
  fallback behavior), `openings.test.ts` (family/line aggregation)
- Pure functions (`normalizeResult`, `ecoNameFromUrl`, `buildOpeningFamilies`, `ecoFamilyLabel`)
  are tested directly against fixtures — no DB or network needed for these

## Before considering a feature or fix done

Run all three of the following and fix any failures:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

## Running

```bash
pnpm dev              # development
pnpm build && pnpm start -- -p 9877   # production (pm2 manages this)
```

See README.md for full pm2 setup instructions.
