# Blitzr — Claude Code instructions

## What this is

A local, single-user chess repertoire trainer built from the owner's own Chess.com and Lichess games. Public
and open-source, but scoped for one person on their own machine: no accounts, no hosted version,
no multi-user support.

Built incrementally, one feature or fix at a time — don't scaffold speculative future work.

## Stack

- **Next.js** App Router with Server Actions (`'use server'`)
  — newer than model training data; check `node_modules/next/dist/docs/` before using an API
- **SQLite** (Kysely + `better-sqlite3`) behind `getRepository()` (`lib/db/`)
- **Tailwind CSS v4**, **TypeScript**
- **chess.js** for PGN/move validation, **react-chessboard** (v5, `options` prop API) for boards
- **react-hot-toast** for toasts, rendered with our own classes by `components/Toast.tsx`
- **Stockfish** (`stockfish` npm package, WASM "lite single-threaded" build) in a browser Web Worker

`pnpm-workspace.yaml`'s `allowBuilds` lists the only dependencies pnpm may run install scripts for:
`unrs-resolver` (behind `eslint-config-next`). `better-sqlite3` is `false`: it ships a prebuilt
binary, and building it would need node-gyp for nothing. `public/stockfish/` comes from our own
`postinstall` (`scripts/setup-stockfish.mjs`). A new dependency that builds on install needs adding.

Node is 22.18+ (`.nvmrc`, `engines`, the `preinstall` guard). `@types/node` stays on the same
major, so tsc rejects APIs Node 22 lacks; Dependabot ignores its majors. Bump all of them together.

## Where things live

- `app/actions.ts` — every Server Action: all DB reads/writes and sync/analysis triggers.
- `lib/` — pure logic (aggregations, drill, tactics, repertoire diff), one test file each.
  `lib/chesscom/`, `lib/lichess/` (API clients), `lib/stockfish/` (UCI wrapper), `lib/db/`.
- `components/` — `styles.ts` holds shared class helpers (no `'use client'`, so Server Components
  can import it).
- `proxy.ts` — 403 unless `Host` is loopback; per-request CSP nonce.
- `scripts/` — postinstall, `pnpm backup`, the puzzle importers, `check-defenses.mjs`, and
  `stockfish.mjs` (native Stockfish, for the defence importer and checker).

`data/` (database, backups, `polgar-mates.json`) and `public/stockfish/` are created at
install/runtime and gitignored. `BLITZR_DATA_DIR` moves `data/` (`lib/dataDir.ts`). Scripts load
`.env.local`, then `.env`, themselves (`process.loadEnvFile`), since only Next does it for the app.

## Key conventions

- **Comments are terse** — only where needed, stating what's really important (a non-obvious why,
  a gotcha), never restating the code.
- **Server Actions** for all DB reads/writes and triggers — no API routes. They're plain POST
  endpoints, so an action storing a client-built payload checks it first (`lib/validate.ts`), and
  replays moves server-side rather than trusting client SAN/FEN. With no auth, they rely on both
  servers binding `127.0.0.1` and on `proxy.ts` rejecting any other `Host` (DNS rebinding sends a
  matching `Origin`, which Next's CSRF check accepts). Hosting it anywhere (#168) means changing both.
- **No page can be framed** (`X-Frame-Options: DENY`, `frame-ancestors 'none'`): a framed page's
  clicks would reach Server Actions with Blitzr's own `Origin`.
- **CSP** is set per request in `proxy.ts`; scripts need its nonce. A new external sound, script or
  font needs adding there; images already allow any `https:`.
- **Domain types are camelCase** (`lib/types.ts`), **DB columns snake_case** (`lib/db/types.ts`);
  the repository maps between them. Never leak snake_case past it.
- **Migrations** run idempotently in `ensureSchema()` (`lib/db/sqlite/migrate.ts`) — no version
  table. New columns go through `alter()` after a `PRAGMA table_info` check; it backs up the
  database first (once per server process). `getRepository()` keeps its instance on `globalThis`
  but replaces one from an older class, so hot reloads of the repository take effect.
- **Aggregations, repertoire diffing and blunder detection are pure functions**, not repository
  methods — backend-agnostic and unit-testable.
- **Layout:** page content sits in a `max-w-7xl` wrapper. Every board is capped by viewport height
  at `lg+` (`max-w-[min(<width>,calc(100dvh-<N>rem))]`, `N` = that page's chrome) so it fits a 13"
  laptop — adding content above/below a board means re-measuring `N`. Button rows sharing space
  with localized labels need `flex-wrap`.
- **Shared UI before new class strings:** `PageHeader`, `Dialog`, `Badge`, `Card` /
  `SectionLabel`, `TableShell`, `IconButton`, `ErrorText`, `Spinner`, `Select`, `Tabs`, `FocusRow`,
  and the helpers in
  `components/styles.ts`. Toasts: pass an `id` so a newer one from the same source replaces the last.
- **Every `<dialog>` is a `Dialog`** (named by its `<h2>` via `useId()`); the caller owns the `ref`
  and `showModal()`.
- **Light/dark theme:** `blitzr-theme` cookie (default `dark`), read in `app/layout.tsx` to set
  `.dark` before first paint. Every component needs an explicit light class alongside its `dark:`
  one. `EvalBar` is deliberately not themed.
- **Per-viewer settings** live in `SettingsProvider`, each in a `blitzr-*` cookie read in
  `app/layout.tsx` — cookies, not localStorage, because react-chessboard's square colors are
  inline-style props and must be right on first render. **Cookie names are duplicated as literals**
  in `layout.tsx` and the client modules — a constant exported from a `'use client'` module reads as
  `undefined` in a Server Component.
- **`BoardProvider`'s `myColor`** is the user's side. Never read `boardOrientation` as "my color" —
  it's only the view, so a flip button can't change whose moves count.
- **A component seeding state from props (`useState(initialX)`) needs `key={id}`** wherever it can
  receive a different record. Exceptions re-sync from props during render: the games list's filter
  form (so its side panel stays open) and `GameAnalysisProvider` (a bulk run saving the open game).
- **react-chessboard:** a unique `options.id` (`useId()`) when two boards share a page; arrows are
  keyed by start/end square only, so dedupe them. `showNotation` is always `false`
  (`BoardCoordinates` draws them outside; a sibling like `EvalBar` then needs `mb-7`).
- **`BoardNavControls`** binds its keys globally, ignoring form fields and `<dialog>`s.
- **Move sounds and site favicons** are hotlinked from the sites' CDNs (not redistributed).
- **Beginner jargon is explained in place** (`<abbr title>` tooltips, `EvalHelp`), not removed.
- **Docs:** update README.md alongside this file.

## Sites and ingestion

Every game has a `site` (`chesscom` | `lichess`). `siteUsername(site)` reads `CHESSCOM_USERNAME` /
`LICHESS_USERNAME`; **at least one is required**, else every route renders only `SetupScreen`.

- Sync is client-driven, month by month, serially (`listArchivesToSync()`, then
  `syncArchiveMonth()`), so a failed month leaves earlier ones saved. `sync_state` marks months
  `complete`/`partial`; the current month (and the previous, for a day) is always re-fetched.
  Auto-sync on open is `SyncProvider` (`BLITZR_AUTO_SYNC_MINUTES`, `0` turns it off).
- Ingestion keeps daily games and variants: Chess.com stores one chess.js can't replay with
  `movesSan: null`, while Lichess skips it (Horde, Crazyhouse…) since its parser needs the moves.
  Filtering happens in `app/actions.ts`:
  engine features need `isStandardChess()`; opening features also need `startsFromStandardPosition()`.
- **Chess.com** (`https://api.chess.com/pub`): always send a descriptive `User-Agent`. Avatars are
  fetched live, never stored, failing soft to a letter badge. Quirks: "Play vs Coach" games link to
  an unrelated game (link hidden); "Play Bots" games never appear in the API (add by PGN); "Play vs
  Bot" PGNs hold a bare bot name that can collide with a real user (`fetchBotAvatar()`).
- **Lichess** (`https://lichess.org/api`) has no monthly archives, so `listPendingArchives()` makes
  `lichess:YYYY-MM` keys. A month with an unfinished (correspondence) game stays `partial`. A 429
  waits a full minute, as Lichess asks. Re-fetching a Lichess game refreshes its PGN, opening and
  time class (`upsertGames()`); every other game is insert-only. No profile pictures. Game ids are
  `lichess:<id>`, and Next hands `[id]` params over percent-encoded, so game routes decode them
  (`decodeGameIdParam()`).

## Games that aren't synced

- **Manual games** (`parseManualGame()`, "Add game by PGN") get a random UUID and
  `archiveYm: 'manual'`, so sync never overwrites them; `findDuplicateGame()` checks duplicates by
  the site's game id or by players + moves. **"Not me"** (`isMine: false`) games are skipped by
  every stat, the repertoire diff and the result/color filters.
- **Practice games** (vs the bot, `lib/practiceGame.ts`) are rebuilt server-side from the moves
  the client sends. **They count nowhere**: `listAllGames()` and `listGames()` leave them out, and
  every stat reads through those two — never read `games` around them. A practice game can't be
  practiced from.
- Only manual and practice games can be deleted; FKs cascade to analysis and drill cards.

## Engine analysis

- Stockfish runs **client-side only**; Server Actions only persist results. Evals are normalized
  to White's perspective. `findBlunders()` and `lib/moveQuality.ts` share the blunder cutoff;
  `blunderSeverity()` is a separate scale.
- Bulk "Analyze all" state lives in `BulkAnalysisProvider` (root layout) so a run survives
  navigation; cancel is checked between games.
- Tactical explanations (`lib/tactics.ts`, `lib/hangingPiece.ts`) are deliberately narrow:
  one-ply lookback, no exchange evaluation, absolute pins only.
- **Re-analyzing a game can reset its drill progress:** another strength can shift which plies
  count as blunders, and the deck sync deletes cards whose ply no longer qualifies. Accepted.
- The game page's summary (`buildGameStory()`) words positions in `describeEval()`'s bands
  (`EVAL_BANDS_CP`), so it agrees with the text under the board, but counts a mistake or blunder as
  a turning point only if it changes the coarser `TURN_GROUP`, so slips that stay winning don't pad it.
- Building positions replays the game, so per-phase stats run only in the game page, not
  across every game on `/blunders` (#304). An endgame lesson's "your games" line and Today's endgame
  suggestion do replay games, so `findGamesReachingMaterial()` prunes by final material and
  `app/actions.ts` memoizes each game's `piecesReached()` for the server's lifetime.
- `useLiveAnalysisContext()` returns an empty default without a provider, so `/learn` can render
  `BoardView` without an engine. Explore mode is never persisted.

## Puzzles and lessons

- Puzzles are hardcoded (`lib/puzzleSet.ts`, server only); client code imports only
  `lib/mateProblems.ts`, so the puzzle data never ships to the browser. Ids key `puzzle_progress`,
  so the import scripts keep existing ids when re-run.
- **Polgár puzzles are local only** (copyrighted): `scripts/import-polgar-mates.mjs` writes the
  gitignored `data/polgar-mates.json`.
- Lesson content is hand-authored (`lib/openingTheory.ts`, `lib/endgameTheory.ts`,
  `lib/positionTheory.ts`). Play's goal is mate, promotion, or a lesson's `playGoal` (a draw to hold).
  `lesson_progress` (keyed by slug, so slugs stay stable, like puzzle ids) keeps a finished quiz and the
  strongest Play win; a lesson is done with both (openings: the quiz). Every
  `sourceUrl` must be read live before citing. **Summaries are paraphrased, never copied**
  (Wikibooks is CC BY-SA, this repo is MIT).

## i18n

English and Spanish via `NEXT_PUBLIC_LOCALE` (rebuild to change). `es` is typed against
`typeof en`, so missing keys fail `tsc`. SAN, square names and `ecoName` are never translated.
User-facing errors come from the dictionary, and Server Actions **return** them
(`{ ok: false, error }`) rather than throw, since Next redacts thrown messages in production.

## Testing

**Vitest** (`pnpm test`), in `__tests__/`, one file per `lib/` module, against fixtures — no DB,
network or browser, except the SQLite repository and migration tests. Worker-driven code isn't
unit-tested; its pure parsers are.

## Before considering a feature or fix done

```bash
pnpm format:check
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

CI (`.github/workflows/ci.yml`) runs these on every PR and weekly, after `pnpm audit --prod`, then
smoke-tests `pnpm start`. A page that throws still answers 200 (`loading.tsx` streams), so the smoke
test checks the server log for `⨯` errors; it also checks the Stockfish `.wasm` is served as
`application/wasm` and every page's scripts carry the CSP nonce. It then loads every `lib/` file a
script imports under plain Node, whose type stripping rejects enums, parameter properties and
imports without `.ts` (which tsc allows), and runs `pnpm backup` against the smoke database.

## Running

```bash
pnpm dev                          # development, localhost only like start
pnpm build && pnpm start -p 9877  # production, localhost only (pm2 manages this, see README)
```

**`pnpm build` corrupts a running `pnpm dev`'s Turbopack cache** (they share `.next/`), so the
dev server silently serves stale code. Restart it after building.

## Git workflow

- **Never commit to `main`.** Branch, commit, `gh pr create`.
- **Conventional commits** (`feat:`, `fix:`, `chore:`, `style:`, lowercase) for commit messages
  (enforced by commitlint) and PR titles (linted by `pr-title.yml`, since squash merges use them).
