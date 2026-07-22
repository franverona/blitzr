# Blitzr — Claude Code instructions

## What this is

A local, single-user chess repertoire trainer built from the owner's own Chess.com games.
Public, open-source, but scoped for one person running it on their own machine. No accounts,
no hosted version, no multi-user support.

Built in phases; only build what the current phase asks for. Don't scaffold future phases
ahead of time.

- **Phase 1 (done)**: username config, incremental Chess.com sync into SQLite, browse UI
  (game list, board replay, openings aggregated by ECO). No engine.
- **Phase 2 (done)**: user-defined repertoire (opening trees per color), diff each game against
  it to flag the first deviating move.
- **Phase 3 (done)**: Stockfish (WASM, in a Web Worker) analysis — per-game blunders and biggest
  eval drop.
- **Phase 4 (done)**: spaced-repetition drilling (`/drill`) of repertoire deviations and your own
  blunders, via a card per drillable position scheduled with SM-2.
- **Phase 5 (done)**: cross-game "recurring blunders" aggregate (`/blunders`), grouped by opening
  and by piece, scoped to whatever games already have a saved analysis.

## Stack

- **Next.js** App Router with Server Actions (`'use server'` file directive)
- **Pluggable database** behind a `GameRepository` interface (`lib/db/`), selected at runtime
  via `DB_TYPE`. Only `sqlite` (via Kysely + `better-sqlite3`) is implemented — see "Database
  backend" below
- **Tailwind CSS v4**
- **TypeScript**
- **chess.js** for PGN parsing/move validation, **react-chessboard** (v5, `options` prop API)
  for the board UI
- **Stockfish** (`stockfish` npm package, WASM, "lite single-threaded" build) run in a browser
  Web Worker — see "Engine analysis" below

## Project structure

```
app/
  actions.ts              # all DB reads/writes + the sync/analysis triggers (Server Actions)
  page.tsx                 # games list (paginated), with the Sync and Analyze all buttons
  layout.tsx                # left sidebar nav (fixed width) + full-width main content
  globals.css
  games/[id]/page.tsx        # single game — board replay, repertoire diff, analysis panel,
                               # or raw PGN fallback for unparseable games
  openings/page.tsx           # ECO family aggregation, expandable to named lines
  repertoire/page.tsx          # repertoire tree builder (White/Black tabs)
  drill/page.tsx                # spaced-repetition drill deck, reads ?type/?opening
                                  # (see "Drilling")
  blunders/page.tsx              # cross-game blunder aggregate (see "Blunders aggregate")
components/
  GameList.tsx / GameRow.tsx  # games table
  Board.tsx                    # BoardProvider/BoardNavControls/BoardView (client) — read-only
                                 # replay board, split via Context the same way as
                                 # GameAnalysisPanel (see "Engine analysis")
  RepertoireBoard.tsx            # react-chessboard in edit mode (drag or click-to-move),
                                   # builds the repertoire tree as you play moves; also owns the
                                   # page header (color tabs, Start/Back, HelpButton dialog — see
                                   # "Repertoire")
  RepertoireTree.tsx               # nested move-tree view with branch switching (client)
  GameAnalysisPanel.tsx              # Stockfish trigger button (header) + results <dialog>
                                       # (content) + GameSummary (biggest-blunder recap),
                                       # sharing state via Context (client)
  DrillSession.tsx                     # one drill card at a time — move input, grading,
                                         # hints, keyboard shortcuts, session summary (client,
                                         # see "Drilling")
  DrillFilters.tsx                       # sourceType tabs + opening select, ?type/?opening
                                           # (client, see "Drilling")
  BlunderStats.tsx                       # by-opening table, by-piece chips, worst-blunders list
                                           # (server component, see "Blunders aggregate")
  EvalHelp.tsx                             # "how to read this" glossary for eval/blunder/swing
                                             # notation — shared by GameAnalysisPanel and
                                             # BlunderStats so it's written once
  BlunderSeverityBadge.tsx                   # Mistake/Blunder severity pill, shared by
                                               # GameAnalysisPanel and BlunderStats
  LegalMoveSquare.tsx                    # squareRenderer helper (dot/ring/yellow-selected
                                           # highlighting) shared by RepertoireBoard and
                                           # DrillSession — see "Board interaction" below
  OpeningsTable.tsx                    # family/line aggregation table (client, expand/collapse)
  PieceGlyph.tsx / PieceMoveLabel.tsx    # Wikimedia chess piece SVGs, colored by moving side
  KnightGlyph.tsx / KnightIcon.tsx         # illustrated knight (favicon, White/Black side badge)
  PlayerAvatar.tsx                           # Chess.com profile avatar (plain <img>), initial-letter
                                               # fallback when a player has none or the fetch fails
  NavLinks.tsx                                 # active-tab nav (client, usePathname)
  SyncButton.tsx                                  # triggers the sync Server Action (client)
  BulkAnalyzeButton.tsx                              # "Analyze all" — runs analyzeGames() across
                                                       # every unanalyzed game (client, see "Engine
                                                       # analysis" > "Bulk analysis")
lib/
  config.ts                # getChesscomUsername() — reads CHESSCOM_USERNAME
  types.ts                  # domain types: Game, OpeningFamily/Line, RepertoireNode,
                              # GameAnalysis/PositionEval/Blunder/HangingPieceReason,
                              # DrillCard/DrillPrompt, ArchiveSyncStatus, SyncResult
  dates.ts                   # formatDate/formatDateTime — hand-formatted, not Intl (see below)
  san.ts                       # splitSanPiece, plyLabel, describeMove() — SAN/move-number display
                                 # helpers; describeMove() turns SAN into a plain-English sentence
  material.ts                    # materialDiff()/formatMaterialDiff() — pure piece-value count,
                                   # no engine/analysis dependency
  hangingPiece.ts                # detectHangingPiece()/describeHangingPieceReason() — v1
                                   # "why was this a blunder" heuristic, hanging pieces only
  legalMoves.ts                 # legalDestinations(fen, square) — chess.js wrapper, drives the
                                  # dot/ring legal-move highlighting on interactive boards
  positions.ts                  # buildPositions() — walks movesSan into a FEN-per-ply array,
                                  # shared by board replay and engine analysis
  openings.ts                    # buildOpeningFamilies() — pure aggregation, unit-tested
  repertoire.ts                    # buildRepertoireIndex(), diffGameAgainstRepertoire() — pure
  analysis.ts                       # findBlunders(), biggestBlunder(), formatEval() — pure
  drill.ts                           # candidate-finding, card hydration, SM-2 scheduling — pure
                                       # (see "Drilling")
  blunders.ts                          # buildBlunderStats() — pure aggregation, unit-tested
                                         # (see "Blunders aggregate")
  sync.ts                            # syncAllArchives() — orchestrates client + normalize + repo
  chesscom/
    client.ts                        # fetchArchives, fetchArchiveMonth — serial, UA header, 429 backoff
    normalize.ts                       # raw Chess.com game -> Game (result bucketing, my_color,
                                         # moves_san, eco); parsePgnHeaders() exported for reuse
  stockfish/
    client.ts                        # StockfishEngine — thin UCI wrapper around the Worker,
                                       # normalizes evals to White's POV
    analyze.ts                        # analyzeGame()/analyzeGames() orchestrate the per-position
                                        # loop (single game / bulk, sharing one engine);
                                        # terminalEval() scores checkmate/stalemate directly
                                        # instead of asking the engine (see "Engine analysis")
  db/
    index.ts                # barrel: export { getRepository }
    factory.ts                # getRepository() — reads DB_TYPE, dispatches to a backend
    types.ts                   # Kysely DbSchema (snake_case) + GameRepository interface + DbType
    sqlite/
      connection.ts             # better-sqlite3 + Kysely singleton, globalThis-cached;
                                  # `PRAGMA foreign_keys = ON` (needed for repertoire cascade deletes)
      migrate.ts                  # ensureSchema() — DDL, idempotent
      repository.ts                 # SqliteGameRepository — camelCase Game <-> snake_case row mapping
      index.ts                       # getSqliteRepository(), globalThis-cached
scripts/
  setup-stockfish.mjs      # postinstall — copies the engine .js/.wasm from node_modules into
                             # public/stockfish/ (gitignored; Workers need a real URL to load)
data/
  blitzr.db             # created at runtime, gitignored
public/
  stockfish/            # copied by scripts/setup-stockfish.mjs, gitignored (~7MB .wasm)
```

## Key conventions

- **Server Actions** for all DB reads/writes and the sync/analysis triggers — no API routes.
- **Domain types are camelCase** (`lib/types.ts`); **DB columns are snake_case**
  (`lib/db/types.ts`). Each repository implementation maps between them explicitly (see
  `gameToRow`/`rowToGame`, `rowToRepertoireNode`, `rowToGameAnalysis` in
  `lib/db/sqlite/repository.ts`) — never leak snake_case past the repository layer.
- `better-sqlite3` is excluded from webpack bundling via `serverExternalPackages` in
  `next.config.ts`.
- **Migrations** run idempotently in `ensureSchema()` (`lib/db/sqlite/migrate.ts`) — extend the
  schema with `CREATE TABLE IF NOT EXISTS` / additive `ALTER TABLE ... ADD COLUMN` wrapped in
  try/catch. No migration-version table.
- **Games are immutable once synced**: `upsertGames` uses `ON CONFLICT DO NOTHING`, not an
  update — a finished Chess.com game's data doesn't change, so there's nothing to reconcile on
  re-sync. It returns `numInsertedOrUpdatedRows` from Kysely's `InsertResult`, not
  `games.length` — the latter is the attempted count, not how many were actually new, and since
  the current month's archive is always re-fetched (see "Incremental sync" below), most of every
  sync's rows hit the conflict branch and should report as 0 added, not the full archive size.
- **`moves_san` and `game_analysis.evals` are JSON array columns, not ply-indexed tables** —
  board replay, repertoire diffing, and blunder detection all walk the array in application
  code; nothing needs to query at ply granularity in SQL. Revisit only if that changes.
- **Chess.com's per-player `result` string** (`win`/`checkmated`/`resigned`/`agreed`/…) is
  bucketed into `win`/`draw`/`loss` by `normalizeResult()` (`lib/chesscom/normalize.ts`) — see
  that file for the exact draw-outcome set.
- **PGN headers are parsed independently of chess.js** (`parsePgnHeaders()`, exported from
  `normalize.ts`) so header fields (ECO/ECOUrl/Event/Link/…) are available even for games whose
  movetext chess.js can't validate (e.g. bughouse's piece-drop notation), and reused elsewhere
  (e.g. `app/games/[id]/page.tsx` checks `Event === "Play vs Coach"` to hide the Chess.com link
  for bot games — see "Known Chess.com API quirks"). `movesSan`/`finalFen` are `null` for
  unparseable games; the game page falls back to showing the raw PGN, and the repertoire diff
  and analysis panel are skipped entirely (both need `movesSan`).
- **Date formatting is hand-rolled, not `Intl`/`toLocaleString`** (`lib/dates.ts`) — a
  server-rendered date and a client-hydrated one can disagree if the server and browser locales
  differ, causing a hydration mismatch. `formatDate`/`formatDateTime` always render `DD/MM/YYYY`
  regardless of locale.
- **Openings aggregation and repertoire diffing are pure functions**, not repository methods:
  `buildOpeningFamilies()` (`lib/openings.ts`) and `diffGameAgainstRepertoire()`
  (`lib/repertoire.ts`) take plain data in and return plain data out. Keeps them backend-agnostic
  and directly unit-testable, and mirrors the same pattern `lib/analysis.ts`'s blunder detection
  uses for Phase 3.
- **The left sidebar (`app/layout.tsx`) is a fixed width, `main` has no `max-w-*`/`mx-auto`
  constraint** — deliberately, so the board and move list can use as much of the viewport as
  possible (closer to how chess.com lays out a game page) rather than being centered in a
  narrower column.
- **`GameAnalysisProvider` needs `key={game.id}`** (`app/games/[id]/page.tsx`) — it seeds its
  state with `useState(initialAnalysis)`, which only reads that value on mount. Without the key
  forcing a full remount on every distinct game, navigating from an analyzed game to an
  unanalyzed one (same component instance, same tree position, just new props from the
  revalidated Server Component) would keep showing the _previous_ game's analysis state instead
  of picking up the new `initialAnalysis`. The same trap bit a `<details>` element's open/closed
  state here before the analysis results moved into a dialog (native DOM state surviving a
  client-side navigation the same way) — worth remembering if a `<details>` gets reintroduced
  anywhere game-specific.
- **`Board.tsx`'s `Chessboard` only animates adjacent-ply steps** — `showAnimations` is
  `Math.abs(ply - prevPly) === 1`, not a flat `false`. react-chessboard's slide animation looks
  right for a single move (◀/▶, or clicking the very next move in the list) but tries to animate
  every piece that differs between two non-adjacent positions at once for a multi-ply jump
  (⏮/⏭, or clicking a move further down the list), which reads as a flicker/blink rather than a
  clean cut — so jumps still swap instantly. `prevPly` is tracked with `useState`, updated
  during render via React's documented "adjust state when a prop changes" pattern (`if (ply !==
prevPly) { ...; setPrevPly(ply) }`), not a ref — the project's eslint config flags
  `ref.current` reads during render (`react-hooks/refs`), so a ref-based "previous value"
  wouldn't lint clean here.
- **`Board.tsx` is split the same way as `GameAnalysisPanel.tsx`**: `BoardProvider` owns ply
  state behind a Context, `BoardNavControls` (⏮◀counter▶⏭, in the page header) and `BoardView`
  (the board + move list) are separate consumers so the nav row can sit next to `AnalyzeButton`
  in the header while the board itself renders further down the tree. Needs the same
  `key={game.id}` on `BoardProvider` as `GameAnalysisProvider` does, for the same reason —
  `useState(lastPly)` only reads its initial ply on mount.
- **Legal-move highlighting on interactive boards** (`RepertoireBoard.tsx`, `DrillSession.tsx`):
  `legalDestinations(fen, square)` (`lib/legalMoves.ts`) computes destinations for whatever's
  selected, then a `squareRenderer` (react-chessboard v5) wraps every square in
  `LegalMoveSquare.tsx` to draw a dot (quiet move), a ring (capture), or a light-yellow
  background (the selected square itself). `squareRenderer`, when provided, fully replaces
  react-chessboard's own `squareStyles` background handling — don't set both on the same board.
  The read-only replay board (`Board.tsx`) doesn't use this; it has no selectable squares.

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
- Tables: `games`, `sync_state`, `repertoire_moves` (branching tree per color, `ON DELETE
CASCADE` from a node to its subtree — requires the `foreign_keys` pragma, see
  `sqlite/connection.ts`), `game_analysis` (one row per analyzed game, keyed by `game_id`,
  `ON DELETE CASCADE` if the game is ever removed), `drill_cards` (one row per drillable
  position — spaced-repetition schedule only, see "Drilling"; keyed by `(game_id, source_type,
ply)` rather than a synthetic id, `ON DELETE CASCADE` on `game_id`).

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
- **Player avatars aren't synced/stored** — `fetchPlayerAvatar()` (`lib/chesscom/client.ts`)
  hits `/pub/player/{username}` live on every game page view and is never cached, since it's
  purely decorative for a low-traffic single-user app. It swallows any failure (unknown user,
  bot with no public profile, rate limit) and returns `null` rather than breaking the page —
  `PlayerAvatar.tsx` falls back to an initial-letter badge in that case.

### Known Chess.com API quirks

- **"Play vs Coach" bot games have a broken `url`/PGN `[Link]`** — both point to an unrelated
  random game, not the actual bot session (verified directly; Chess.com's own site doesn't
  resolve it correctly either). There's no other identifier in the API response to derive a
  correct link from. `app/games/[id]/page.tsx` hides the "View on Chess.com" link when the
  PGN's `[Event]` header is `"Play vs Coach"`, rather than linking somewhere wrong.
- **"Play Bots" personality games (e.g. named bots like "Santiago") don't appear in the public
  API at all** — `/games/archives` and the monthly endpoints only return real Live/Daily games
  and "Play vs Coach" sessions. Chess.com's own site shows a much larger game count because it
  includes activity the public Published-Data API simply never exposes. Nothing to fix here;
  there's no data to sync.

## Repertoire (Phase 2)

- A **branching tree per color** (`repertoire_moves`): each node has a `parent_id` (null =
  root/first move), a `ply`, a `move_san`, and the resulting `fen`. Multiple children at one
  node are expected — that's how you prepare more than one reply to different opponent tries,
  or keep more than one system for yourself.
- **Built interactively** on `/repertoire` (`RepertoireBoard.tsx`): drag or click-to-move on an
  editable board records moves into the tree. Node `id`s are generated **client-side**
  (`crypto.randomUUID()`), not by the server — the client adds a move to its own local state
  and persists it via a Server Action, without waiting on a round trip or reconciling a
  server-generated id.
- **Stale-closure trap**: `RepertoireBoard.tsx` mirrors `path`/`nodes` React state into refs
  (`pathRef`/`nodesRef`), and reads _those_ inside the move-handling logic instead of the
  render-scope `path`/`nodes` closures. Two moves played faster than a React re-render used to
  both read the same pre-update snapshot, corrupting the second move's parent/ply. If you touch
  this component, keep reading from the refs, not the state variables, inside event handlers.
- **The diff** (`diffGameAgainstRepertoire()`, `lib/repertoire.ts`): walks a game's actual moves
  against the tree, following whichever child matches. The first ply with no matching child is
  a **deviation** only if it was the user's own ply _and_ the tree had children there (they had
  a prepared choice and played something else). If the mismatch happens on the opponent's ply,
  or the tree simply has no children there yet, that's not the user leaving their own
  repertoire — it's an unprepared opponent try, or prep that just runs out. The game page
  (`RepertoireDiff` in `app/games/[id]/page.tsx`) only calls out the _deviation_ and
  _followed-the-whole-game_ cases — running out of prep without ever deviating renders nothing,
  since "in book for N moves, then left prepared territory" wasn't a useful enough signal to
  show on every game to be worth the permanent line (`diff.inBookPlies` is still there if you
  want it, just not surfaced here).
- **`RepertoireBoard.tsx` owns the whole page header**, not just the board — `app/repertoire/page.tsx`
  is just a thin Server Component fetching nodes and rendering it. The header row holds the
  `<h1>`, Start/Back buttons, a `HelpButton` (circular "?" opening a native `<dialog>` with the
  old instructions text, centered the same way as `GameAnalysisPanel`'s analysis dialog), and
  the White/Black `ColorTab` links — kept together since none of it needs to live anywhere else
  on the page.
- **Real-time hanging-piece warning**: reuses `detectHangingPiece()` (`lib/hangingPiece.ts`, see
  "Hanging-piece reasons" under "Engine analysis") live, not just in post-hoc blunder lists.
  Since every `RepertoireNode` already carries its own `fen`, the warning is a **derived value,
  not stored state** — `detectHangingPiece(path[path.length - 2]?.fen ?? START_FEN,
currentNode.fen, whiteToMove(currentNode.ply) ? 'white' : 'black')` in a `useMemo` keyed on
  `currentNode`/`parentFen` — so it recomputes correctly for whatever position is current across
  every kind of navigation (a freshly-added move, Start/Back, a sibling branch, a click in
  `RepertoireTree`) with no imperative "clear it" call needed anywhere. Not filtered to the
  account's own moves — a repertoire tree also records anticipated opponent replies, and
  `describeHangingPieceReason()`'s neutral phrasing (no "you"/"they") already reads fine either
  way, same precedent as `AnalysisDialog` showing a reason for every blunder in a game.

## Engine analysis (Phase 3)

- **Client-side only** — Stockfish runs in a **browser Web Worker**, not on the server. Next.js
  Server Actions only persist the result (`getGameAnalysis`/`saveGameAnalysis` in
  `app/actions.ts`); they never run the engine themselves.
- **Engine asset**: the `stockfish` npm package (Nathan Rugg / Chess.com's WASM build) ships
  several flavors; Blitzr uses the **"lite single-threaded"** build (~7MB, no COOP/COEP headers
  required, unlike the multi-threaded builds). `scripts/setup-stockfish.mjs` copies its `.js`
  and `.wasm` from `node_modules/stockfish/bin/` into `public/stockfish/` on every `pnpm
install` (a Worker needs a real URL to load, not something bundled through Turbopack) —
  `public/stockfish/` is gitignored, same reasoning as `data/*.db`.
- **`StockfishEngine`** (`lib/stockfish/client.ts`) is a thin UCI wrapper: send a command string
  via `postMessage`, read UCI output lines back via `onmessage`. UCI reports `score cp`/`score
mate` relative to **whoever is to move** in the given position, not always White — the
  wrapper normalizes every returned eval to White's perspective so callers never have to think
  about whose turn it was.
  - **Movetime is 300ms per position** (`go movetime 300`) — a full game analyzes in roughly
    (positions × 0.3s), acceptable for on-demand single-game analysis from a button click, not
    fast enough to run automatically across an entire synced history.
  - **`bestMove`**: the `bestmove` UCI line (long algebraic, e.g. `e2e4`) is parsed via chess.js
    (`parseBestMove()`) into `{from, to, san}` before being attached to the `PositionEval` —
    `from`/`to` drive a board arrow (`Board.tsx` passes them straight to react-chessboard's
    `options.arrows`), `san` is for text display (blunder lists). `parseBestMove()` is a pure
    function (fen + UCI move in, `BestMove | null` out) and is unit-tested directly — the rest
    of `evaluate()` needs a real Worker and isn't.
- **Terminal positions are scored directly, not asked of the engine**
  (`terminalEval()` in `lib/stockfish/analyze.ts`): a position with zero legal moves
  (checkmate/stalemate) gives Stockfish nothing to search, and its `score mate 0`-style output
  for that edge case was observed to be ambiguous in sign — it made the _checkmating move
  itself_ look like a huge blunder. `terminalEval()` uses chess.js's `isCheckmate()`/
  `isStalemate()` to assign an unambiguous eval (mate for whoever delivered it, or an exact
  0.0 draw) instead of querying the engine for a position that has nothing to search.
- **Blunder detection** (`findBlunders()`, `lib/analysis.ts`): compares each position's eval to
  the next, converts both to "how good for the player who just moved" (flipping sign for
  Black), and flags any swing ≥200 centipawns. Mate scores are mapped to a fixed ±100,000 so a
  swing into or out of a forced mate always crosses the threshold, without needing to compare
  mate-in-N counts to centipawns directly.
- **Storage**: `game_analysis` stores one row per game — `evals` is a JSON array of
  `{cp, mate, bestMove}`, one per position (same indexing as `movesSan`/`buildPositions()`'s
  output). Re-analyzing a game overwrites its previous result (`onConflict` upsert), there's no
  history of past analysis runs. `evals` is an opaque JSON blob (`JSON.parse`/`JSON.stringify` in
  `lib/db/sqlite/repository.ts`), so adding `bestMove` needed no migration — analyses saved
  before this field existed just parse back without it (falsy, so display code that checks
  `evals[i].bestMove` skips it silently rather than crashing); re-analyzing backfills it.
- **Best move**: `evals[i].bestMove` is what the engine recommends _from_ position `i` — i.e.
  what should have been played instead of `movesSan[i]`. Shown two places: as a yellow arrow on
  the board as you step through ply-by-ply (`Board.tsx`, synced to the currently viewed
  position, via react-chessboard's `options.arrows`), and as SAN text next to each blunder in
  `GameAnalysisPanel.tsx` (using `evalBefore.bestMove.san`, the recommendation from right before
  the blunder was played). `null` for terminal positions (no legal moves).
- **The Analyze/Re-analyze button lives in the game header (top-right); the results live in a
  native `<dialog>`** (`GameAnalysisPanel.tsx`), opened via a "View analysis" link next to the
  button. `GameAnalysisProvider` owns all the client state (analysis/progress/error) and passes
  it through a Context, since the button and the dialog's trigger aren't adjacent in the tree —
  `AnalyzeButton` renders both the trigger button and the `<dialog>` together (so one ref can
  call `showModal()`/`close()`), while `app/games/[id]/page.tsx` places `AnalyzeButton` next to
  the header and doesn't otherwise reach into the analysis internals. The dialog is centered
  with `fixed` + `inset-1/2` + negative-translate, not the browser's default `<dialog>` centering
  — the project's CSS reset strips the default margin `<dialog>` relies on for that.
- **Bulk analysis** (`BulkAnalyzeButton.tsx`, "Analyze all" on the Games page) reuses a single
  `StockfishEngine` across every unanalyzed game instead of spinning up a fresh Worker (~7MB WASM
  load + UCI handshake) per game — `analyzeGames()` (`lib/stockfish/analyze.ts`) creates one
  engine, loops a shared `analyzePositions()` helper across each game's positions, and terminates
  once at the end. `analyzeGame()` (the single-game entry point `GameAnalysisPanel.tsx` uses) is
  unchanged — just a thin wrapper around the same `analyzePositions()` helper with its own
  create-and-terminate engine, so this was a pure refactor for existing callers.
  - Each game's result is saved via `saveGameAnalysis()` as soon as that game finishes, not
    batched at the end — closing the tab or clicking Cancel mid-run keeps whatever's already
    saved, and `getUnanalyzedGames()` (`app/actions.ts`) naturally only returns what's still
    missing on the next "Analyze all" click. No separate resume/progress-persistence mechanism
    needed.
  - `analyzeGames()`'s `shouldContinue` callback is checked **between games, not mid-game** — a
    game already in progress always finishes and gets saved, so there's no partial-game analysis
    case to special-case in storage. `BulkAnalyzeButton.tsx` backs this with a ref (not state)
    flipped by both the Cancel button and an unmount cleanup effect, so navigating away from the
    Games page stops the run the same way Cancel does.
  - Still client-side only, like single-game analysis — the loop runs on the Games page and stops
    if that page unmounts; there's no background/server-side job that survives navigation.
- **Plain-English move descriptions** (`describeMove(fenBefore, san)`, `lib/san.ts`) replay a
  single SAN move via chess.js to read off `piece`/`captured`/`promotion`/the `isCapture()`/
  `isCastle*()`/`isPromotion()` descriptor methods, and produce a sentence like "Queen captures
  pawn on f6, check" — added beneath the raw SAN wherever a blunder list shows it
  (`GameAnalysisPanel.tsx`'s dialog, `BlunderStats.tsx`'s worst-blunders list), since those are
  exactly the spots that read as jargon-heavy to someone who doesn't have SAN memorized. Note
  chess.js's `isCapture()` is **false** for en passant — `isEnPassant()` is a distinct flag not
  combined with the regular capture flag, so `describeMove()` checks both to still describe an
  en passant capture as a capture.
- **`GameSummary()`** (`GameAnalysisPanel.tsx`, rendered in `app/games/[id]/page.tsx` under
  `RepertoireDiff`) is a one-line plain-language recap — the single biggest blunder in the game
  (`biggestBlunder(findBlunders(...))`, both already existed), whether it was the account's own
  move or the opponent's (`whiteToMove()` from `lib/drill.ts` compared against `game.myColor`),
  and what the move was via `describeMove()`. Renders nothing until there's a saved analysis,
  same "quietly do nothing when not applicable yet" pattern `RepertoireDiff` already uses.
  `AnalysisContextValue` grew a `positions` field (computed once in `GameAnalysisProvider`, a FEN
  per ply) so both `GameSummary` and `AnalysisDialog` can call `describeMove()` without each
  recomputing `buildPositions()` themselves.
- **Material count** (`materialDiff()`/`formatMaterialDiff()`, `lib/material.ts`) is a plain piece
  count (P1/N3/B3/R5/Q9, no engine involved), shown in `Board.tsx`'s `BoardView` next to the eval
  description. Unlike the eval bar/description this doesn't need a saved analysis, so it always
  renders — a beginner-friendlier first read than a centipawn eval bar, and still useful on a
  game that's never been analyzed. Scoped to the read-only replay board only for now, not
  `RepertoireBoard`/`DrillSession`.
- **Opening link**: `Game.ecoUrl` (from Chess.com's PGN header, already used internally by
  `lib/openings.ts`) is now surfaced as a "Learn more about this opening" link in `GameHeader`
  (`app/games/[id]/page.tsx`), next to the ECO code — it existed in the data all along and was
  simply never rendered anywhere.
- **Hanging-piece reasons** (`detectHangingPiece()`/`describeHangingPieceReason()`,
  `lib/hangingPiece.ts`) say _why_ a move was a blunder, not just that it was one — v1 only
  detects the single most common beginner mistake: a piece left attacked and undefended,
  capturable for free. Built entirely on chess.js's own `board()`/`isAttacked()` (no new
  dependency, no custom attack-generation code). Deliberately narrow: no static-exchange
  evaluation (an attacker outvalued by what it'd capture still counts) and no pin awareness (a
  pinned "attacker" still counts) — forks/pins/skewers are a future extension, not this pass.
  Takes the position **before and after** the blunder move (not just after) so one function
  catches two distinct cases: the piece that just moved walking into an attacked square, and a
  _different_ piece the mover stopped defending (a discovered hang) — while a piece already
  hanging before the move (a standing weakness, not something this move caused) is filtered out
  by comparing the two. When more than one piece is newly hanging at once, the higher-value one
  is reported. This needs both FENs, which `findBlunders()` (`lib/analysis.ts`) doesn't have (it
  only sees evals), so it's a separate function called wherever `positions` is already available
  rather than a change to `findBlunders`'s signature — `Blunder` is unchanged. Wired into the
  same three spots `describeMove()` reached: `GameAnalysisPanel.tsx`'s `AnalysisDialog` (every
  blunder in the game, computed from `whiteToMove(ply)` since the dialog shows both sides) and
  `GameSummary()` (the account's own biggest blunder, if it was hanging a piece), plus
  `WorstBlunder.reason` on `lib/blunders.ts`'s aggregate (computed only for the ≤10 entries that
  survive the slice, same cost-bounding as `moveDescription` — these are already filtered to the
  account's own moves, so `moverColor` is just `game.myColor`, no extra parity check).
  `PIECE_VALUES` (`lib/material.ts`) and `PIECE_NAMES` (`lib/san.ts`) are exported and reused
  here rather than duplicated. Not every blunder gets a reason — a swing from something other
  than a simple hung piece (a bad trade, a positional error, a missed tactic this heuristic
  doesn't cover) correctly shows no reason line rather than a wrong one.

## Drilling (Phase 4)

- **No new position/eval storage** — a drillable position is fully derivable from data that
  already exists (`games.moves_san`, `repertoire_moves`, `game_analysis.evals`) via the same
  pure functions Phases 2/3 already built. `drill_cards` stores only the spaced-repetition
  schedule, keyed by `(gameId, sourceType, ply)` rather than a synthetic id; everything else
  (the FEN to show, the accepted move(s), board orientation) is recomputed on demand by
  `buildDrillPrompt()` (`lib/drill.ts`) rather than duplicated into storage.
- **Two card sources**: `findDeviationCandidates()` — one card per repertoire-tracked game
  currently at its first deviation ply (reuses `diffGameAgainstRepertoire`); and
  `findBlunderCandidates()` — one card per blunder in an analyzed game (reuses `findBlunders`),
  **filtered to plies the user actually played** — `findBlunders` walks the whole game including
  the opponent's mistakes, which aren't useful to drill ("what should _you_ have played" only
  makes sense for your own moves).
- **Correctness check**: deviation cards accept any of the repertoire's prepared moves at that
  node (multiple prepared replies are valid by design); blunder cards accept only the engine's
  exact suggested move (`evalBefore.bestMove.san`) — not "anything within N centipawns," which
  would need Stockfish running live during a drill session.
- **Deck sync runs on every `/drill` load** (`getDrillDeck()` in `app/actions.ts`), no separate
  "sync" action — same as how the openings aggregation just recomputes fresh on every load. It
  diffs current candidates against stored `drill_cards`: new candidates get a fresh card (due
  immediately), cards no longer matching any candidate get pruned (e.g. the repertoire changed,
  or a re-analysis changed which moves are blunders).
- **Scheduling** (`scheduleReview()`, `lib/drill.ts`) is SM-2 (the algorithm behind
  Anki/SuperMemo) simplified to binary grading — correct/incorrect rather than a 0-5 recall
  scale, since a drill card here is "did you find the move," not free recall. New cards start at
  `easeFactor 2.5`, due immediately; correct answers step the interval 1 day → 6 days →
  `interval × easeFactor` and nudge ease up; an incorrect answer resets to a 1-day interval and
  nudges ease down (floored at `1.3`).
- **`DrillSession.tsx` snapshots its `prompts` prop into state on mount** (`useState(prompts)`,
  read once) instead of using the live prop on every render. `submitDrillAnswer` calls
  `revalidatePath('/drill')` after every answer, which re-runs the deck sync server-side and can
  hand the component a _different_ prompts array mid-session (the just-answered card drops off,
  another becomes due) — reading that directly would let a background revalidation reshuffle an
  in-progress session's cards out from under its `index`, or, worse, collapse straight to the
  "nothing due" empty state the moment the last card is answered instead of showing the session
  summary. `app/drill/page.tsx` always renders `<DrillSession>` unconditionally for the same
  reason — it used to branch between the empty-state message and `<DrillSession>` based on the
  live prompt count, which unmounted the in-progress session (and its tally) the instant the
  count hit zero. The empty-state decision now lives inside `DrillSession`, using its own frozen
  snapshot, so the component identity — and its state — never gets pulled out from under a
  session in progress.
- **Grading is guarded by a ref, not `feedback` state** (`answeredRef` in `DrillSession.tsx`):
  state updates aren't visible to a second handler call within the same synchronous event-handler
  pass, so if the underlying board library's click/drop handlers ever end up firing twice for one
  logical move, a state-only guard wouldn't catch the second call — it'd grade (and
  `submitDrillAnswer`) the same move twice. A ref flips synchronously on the first successful
  grade, so a prompt can only ever be graded once no matter how many times the handlers fire.
- **Move input** mirrors `RepertoireBoard.tsx`'s `attemptMove` pattern (drag or click-to-move,
  `chess.move({from, to, promotion: 'q'})` in a try/catch) rather than sharing code with it — the
  surrounding logic differs enough (no tree, grades against `correctMoves` and locks the board
  instead of always accepting the move) that extracting a shared helper would cost more than it
  saves.
- **Reveal arrow**: on an incorrect answer, the accepted move(s) are drawn as arrows
  (`options.arrows`, same amber `rgba(234, 179, 8, 0.9)` as the engine-suggestion arrow in
  `Board.tsx`) computed by replaying each SAN in `correctMoves` against the prompt's FEN with a
  throwaway chess.js instance — `DrillPrompt.correctMoves` only stores SAN strings, not
  from/to squares, so this is recomputed at reveal time rather than carried in the data model.
- **Real-time hanging-piece warning**: same `detectHangingPiece()` reused live as on
  `RepertoireBoard.tsx` (see "Repertoire"), but **imperative state here, not derived** — unlike
  `RepertoireBoard`'s FEN-per-node path, `DrillSession`'s board always displays `prompt.fen` (it
  never updates to show the position after a move; the "reveal" is via arrows, not a position
  change), so there's no path structure to derive from. `attemptMove` already gets a chess.js
  `Move` back from `chess.move()`, which carries `before`/`after`/`color` directly — exactly what
  `detectHangingPiece` needs — so `hangingReason` is set right there and cleared in `handleNext()`
  alongside the other per-card resets (`answeredRef`, `feedback`, `selectedSquare`). Shown for
  both correct and incorrect answers, not gated on `feedback === 'incorrect'` — a deviation
  card's "correct" move is whatever the repertoire has prepared, which isn't guaranteed hang-free
  either. Purely informational — doesn't touch SM-2 grading, which stays exactly
  `correctMoves.includes(move.san)` regardless of this.
- **Progressive hint** (`hintLevel` state, 0-3, in `DrillSession.tsx`): one "Hint" button, shown
  only while `!feedback`, increments the level by one per click and disables at 3. Resets to 0 in
  `handleNext()` alongside the other per-card resets.
  - Level 1: piece name only, via a new `hintPieceName(san)` in `lib/san.ts` (reuses
    `splitSanPiece`/the already-exported `PIECE_NAMES`, lowercased) — `'castling'` for
    `O-O`/`O-O-O`, `'pawn'` for no leading letter, else the full piece name. For a deviation
    card's multiple `correctMoves`, dedupes: `[...new Set(correctMoves.map(hintPieceName))].join(' or ')`.
  - Level 2: highlights the origin square(s) of `correctMoves` — a new optional `isHintOrigin`
    prop on `LegalMoveSquare.tsx` (default falsy, so `RepertoireBoard.tsx`'s usage needs no
    changes), styled `bg-sky-400/40` — a different hue from the existing yellow
    `isSelected` tint so the two read as distinct signals.
  - Level 3: the full move as an arrow — reuses `revealArrows()` (already in this file for the
    incorrect-answer reveal) and the existing `arrows` prop, just OR'd into the same condition
    that already shows it on an incorrect answer.
  - Levels 2 and 3 both need the same replayed moves from `revealArrows()`, computed once
    (`const revealed = feedback === 'incorrect' || hintLevel >= 2 ? revealArrows(prompt) : []`)
    and sliced per level, rather than calling it twice.
  - The button itself is sized/styled the same as the Next/Restart buttons (not the smaller
    utility-button treatment used elsewhere) with a 💡 emoji prefix, and the level-1 piece-name
    text renders _below_ the board, not above it — both per direct user feedback on the initial
    pass. Only the piece-name text has its own line; the origin highlight and arrow render on
    the board itself.
- **The board now visually reflects a correct answer** (`committedFen` state in
  `DrillSession.tsx`): previously `position` was hardcoded to `prompt.fen` even after a move was
  submitted, so a correct move never visually landed — the piece silently stayed put while
  `feedback` said "Correct!". `committedFen` is set to the chess.js `Move.after` FEN only when
  `correct` is true, and read as `committedFen ?? prompt.fen`; reset to `null` in `handleNext()`/
  `handleRestart()`. Deliberately **not** set on an incorrect answer — the reveal arrow is
  computed from `prompt.fen` (`revealArrows()`), so showing the wrong move actually played would
  put the board and the arrow out of sync with each other.
- **Shuffle and restart** (`handleRestart()` in `DrillSession.tsx`, a button on the
  "Session complete" screen): re-shuffles `sessionPrompts` (a local Fisher-Yates `shuffle()`,
  module-level in this file — single call site, not a `lib/` export) and resets `index`/`tally`/
  `feedback`/`hangingReason`/`hintLevel`/`selectedSquare`/`answeredRef` to start the same batch of
  cards over. `sessionPrompts` gained a setter for this — the very case its original "frozen
  snapshot" design was meant to allow, since it's still only ever reordering what's already
  loaded, never accepting fresh server data (which is what the freeze was protecting against —
  see the comment above the `useState` call). **No new server action** — every answer during the
  replay still calls `attemptMove` → `submitDrillAnswer` exactly as normal, which is what makes
  this "actually reset the schedule" (per the user's own framing) rather than ungraded practice:
  `submitDrillAnswer` (`app/actions.ts`) never checks whether a card is currently due, it just
  grades whatever it's given, so replaying already-answered cards for real is sufficient — no
  need for a dedicated "reset `dueAt`" action.
- **Opponent avatar and centered layout**: `DrillPrompt` gained `opponentUsername` (already
  computed in `buildDrillPrompt()` for `gameLabel`, just also returned raw) and
  `opponentAvatarUrl`. `buildDrillPrompt()` itself stays pure/no-I/O — `opponentAvatarUrl` is
  always `null` coming out of it; `getDrillDeck()` (`app/actions.ts`) fetches each _unique_
  opponent's avatar once via the existing `fetchPlayerAvatar()` (`lib/chesscom/client.ts`, same
  one the game page already uses) and merges it into the prompts afterward, so a session with many
  cards against the same opponent doesn't refetch per card. Rendered via the existing
  `PlayerAvatar.tsx` next to the `gameLabel` text. Separately, `DrillSession.tsx`'s outer
  container gained `mx-auto w-full max-w-140` (moved off the board's own wrapper, which just
  inherits it now; shrunk from an initial `max-w-160` once a full card — board plus the info row,
  hint text, and feedback line — turned out to still overflow a typical viewport height once
  answered) so the whole card — info row, board, feedback — sits centered as one column instead
  of pinned to the left with empty space on the right; applied to all three render states (empty
  deck, active session, session complete) for visual consistency. No move-list/sidebar content
  was added next to the board — unlike `Board.tsx`'s game replay, a drill card has no move
  history to show, so there's nothing to fill that space with yet.
- **Session cap** (`MAX_SESSION_CARDS = 15`, `selectSessionCards()`, `lib/drill.ts`): a session is
  the 15 most-overdue due cards (`dueAt` is an ISO string, so a plain lexicographic sort is
  already chronological), not every currently-due card at once — with a large deck that could
  otherwise be 40+ cards in one sitting. `getDrillDeck()`'s return grew `dueCount` (post-filter,
  pre-cap due count), and the session-complete screen shows a "`N` more due — load more" link
  (a plain `<a href="/drill">`, not `next/link` — a full reload is the simplest way to guarantee
  `getDrillDeck()` actually re-runs; a soft navigation wouldn't update `DrillSession`'s frozen
  `sessionPrompts` anyway, same reasoning as the filter `key` below) when there's more waiting
  than fit in this session.
- **Deck filters** (`?type=deviation|blunder`, `?opening=<family label>`): same URL-driven
  pattern `app/repertoire/page.tsx` already uses for `?color=` — `searchParams` read in the
  Server Component (`app/drill/page.tsx`), passed to `getDrillDeck(filters)`. Filters apply to
  the due-cards list _before_ the session cap above, so `dueCount` reflects "how many match this
  filter," not the whole deck. Opening filtering reuses `ecoFamilyLabel()` (`lib/openings.ts`) —
  same "group by family, not exact ECO code" convention `lib/blunders.ts` already established —
  via a small `openingLabel(game)` helper in `app/actions.ts`; `availableOpenings` (the dropdown's
  options) is computed from the _full unfiltered_ live deck so choices don't shift as filters are
  applied. New `components/DrillFilters.tsx` (`'use client'`, needed for the opening `<select>`'s
  `onChange` to navigate): sourceType tabs are plain `Link`s, exactly `RepertoireBoard.tsx`'s
  `ColorTab` pattern. **`<DrillSession key={...sourceType/opening...}>`** in `app/drill/page.tsx`
  — changing filters is a real navigation with fresh `searchParams`, but `DrillSession`'s
  `sessionPrompts` only reads its `useState(prompts)` initial value, so without a key tied to the
  filters it would keep showing the _previous_ filter's frozen session instead of remounting with
  the new one — same trap `GameAnalysisProvider`/`BoardProvider` already guard against with
  `key={game.id}`.
- **Keyboard shortcuts**: Space/Enter → `handleNext()` (only once `feedback` is set — there's no
  "submit" step for the move itself); `h`/`H` → `handleHint()` (only while `!feedback`). Both
  handlers are wrapped in `useCallback` (empty deps — they don't close over anything that
  changes) so the `useEffect` registering the `keydown` listener has a stable, lint-clean
  dependency array instead of re-subscribing every render. Guards against `event.target` being a
  `<button>` before acting — pressing Enter/Space on a still-focused button (e.g. right after a
  mouse click) also triggers that button's own native activation, and without the guard this
  listener would fire _again_ for the same keypress, double-advancing. In practice this rarely
  matters even without the guard (disabled/unmounted buttons lose focus automatically, verified
  live), but it's cheap insurance for whenever a button stays enabled and focused across the
  keypress.

## Blunders aggregate (Phase 5)

- **Pure aggregation over already-stored data**, no new table — mirrors `buildOpeningFamilies()`
  (`lib/openings.ts`): `buildBlunderStats()` (`lib/blunders.ts`) takes every game plus a
  `gameId -> GameAnalysis` map and returns counts/groupings, computed fresh on every `/blunders`
  load via `getBlunderStats()` (`app/actions.ts`), which just calls the existing
  `listAllGames()`/`listAllGameAnalyses()` repository methods (both already existed for the
  Phase 4 drill deck sync — no new repository work needed here).
- **Scoped to analyzed games only** — covers whatever's been analyzed so far, whether one game at
  a time from a game's page or in bulk via "Analyze all" on the Games page (see "Bulk analysis"
  under "Engine analysis"). The page's summary line ("N blunders across M of T synced games
  analyzed") makes that scope explicit rather than implying full coverage, since a fresh sync can
  still add games with no analysis yet.
- **Own moves only**, same filter as the drill deck's blunder cards: `whiteToMove()` (exported
  from `lib/drill.ts` rather than duplicated) checks the blundering ply was actually played by
  the account's own color, so an opponent's mistake in an analyzed game never counts.
- **Grouped two ways**: by opening family (keyed by `ecoCode`, labeled via the existing
  `ecoFamilyLabel()` from `lib/openings.ts` — the same family grouping Openings already uses) and
  by moved piece (keyed off `splitSanPiece()` from `lib/san.ts`, with `'pawn'`/`'castle'` buckets
  for moves that have no leading piece letter — pawn moves and `O-O`/`O-O-O`).
- **`avgSwingCp` excludes mate-sentinel swings, but they still count toward the group's blunder
  total** — a swing into/out of a forced mate is measured against `evalToCp`'s internal
  ±100,000 sentinel (`lib/analysis.ts`), not real centipawns; averaging that in with genuine
  swings produced a nonsense "985 pawns" figure during manual testing. `BlunderGroupStat.avgSwingCp`
  is `number | null` — `null` when every blunder in that group was a mate-swing, rendered as
  `—` in `BlunderStats.tsx`. The "worst blunders" list doesn't have this problem since it already
  goes through `formatSwing()` (`lib/analysis.ts`), which describes a mate swing in words instead
  of a raw number.
- **`components/BlunderStats.tsx` is a plain Server Component**, not a client component — unlike
  `OpeningsTable.tsx` it has no expand/collapse state, so there's nothing that needs `'use
client'`. Reuses `PieceGlyph` (white variant, on the same green badge `PieceMoveLabel.tsx` uses)
  for the by-piece chips — there's no pawn glyph asset, so the `'pawn'`/`'castle'` buckets render
  as plain text labels instead. Note: the light-mode Tailwind classes throughout this file (and
  `OpeningsTable.tsx`) are vestigial — `app/globals.css` forces dark mode unconditionally
  (`className="dark"` in `app/layout.tsx`), so `dark:` variants always win regardless of what the
  base class says. Harmless, just don't read the light-mode classes as meaning this page actually
  supports a light theme.
- **Each worst-blunder entry links to `/games/{gameId}`**, not to the specific ply — there's no
  URL-driven initial ply on the game page (`BoardProvider` seeds its ply from `useState`), so
  deep-linking into the exact position wasn't attempted here; landing on the game and stepping
  through the move list is enough for v1.
- **`WorstBlunder.moveDescription`/`.reason`** (plain-English text via `describeMove()`,
  `lib/san.ts`, and the hanging-piece check via `detectHangingPiece()`, `lib/hangingPiece.ts` —
  see "Hanging-piece reasons" under "Engine analysis") are both computed in `buildBlunderStats()`
  only for the ≤10 entries that survive the sort-and-slice to the worst list, not for every
  blunder counted along the way — the intermediate collection type is
  `BlunderCandidate = Omit<WorstBlunder, 'moveDescription' | 'reason'>`, enriched (via a
  `gameId -> Game` lookup to rebuild that specific game's positions) only after slicing, to keep
  the per-blunder FEN-replay cost bounded to what's actually displayed.
- **`EvalHelp` (`components/EvalHelp.tsx`) is a shared "how to read this" glossary**, extracted
  from `GameAnalysisPanel.tsx` (where it originally lived as a private function) so `/blunders`
  could reuse the same eval/mate/blunder notation explanations instead of duplicating them —
  rendered at the bottom of both `AnalysisDialog` and `BlunderStats.tsx`, same `<details>`
  placement convention in both. Picked up one addition here: a "Swing" bullet defining what
  "avg swing" means, since that term only appears on the Blunders page and wasn't explained
  anywhere before. This was written for a beginner-facing pass — the user found the Blunders
  and Repertoire screens too jargon-heavy, so terminology got explained in place rather than the
  features being simplified/removed (see also the `<abbr title="...">` tooltips on ECO codes and
  "in book"/"deviated" in `app/games/[id]/page.tsx`, and the expanded intro paragraph in
  `RepertoireBoard.tsx`'s `HelpButton` dialog explaining what a repertoire _is_, not just how to
  build one).
- **Move quality tiers** (`blunderSeverity()`, `lib/analysis.ts`): every flagged blunder (still
  the same 200cp+ `BLUNDER_THRESHOLD_CP` set — this doesn't change what counts as a blunder
  anywhere, including `/drill` candidates and the `/blunders` aggregate counts/averages) gets a
  finer display label — "Mistake" for 200–399cp, "Blunder" for 400cp+
  (`SEVERE_BLUNDER_THRESHOLD_CP`). A mate-sentinel swing (`evalToCp`'s ±100,000) always clears
  400, so a swing into/out of forced mate always reads as the more severe tier. Shown via a shared
  `<BlunderSeverityBadge swingCp={...}>` (same colored-pill convention as `RESULT_BADGE_STYLES` in
  `GameRow.tsx`) in both `GameAnalysisPanel.tsx`'s `AnalysisDialog` blunder list and
  `BlunderStats.tsx`'s worst-blunders list, and as a severity-aware verb in `GameSummary()`
  ("blundered" vs "made a mistake"). `EvalHelp` picked up a matching glossary bullet.

## Testing

- **Vitest** — run with `pnpm test` (or `pnpm test:watch`)
- Tests live in `__tests__/`, one file per `lib/` module they cover: `normalize.test.ts`,
  `openings.test.ts`, `repertoire.test.ts`, `analysis.test.ts`, `san.test.ts` (including
  `describeMove()`/`hintPieceName()`), `material.test.ts`, `hangingPiece.test.ts`, `dates.test.ts`, `drill.test.ts`,
  `blunders.test.ts`, `stockfish-analyze.test.ts` (just `terminalEval()`) and `stockfish-client.test.ts` (just
  `parseBestMove()`) — the rest of `evaluate()`/`analyzeGame()`/`analyzeGames()` needs a real
  browser Worker and isn't unit-tested. `analysis.test.ts` also covers `blunderSeverity()`.
- Pure functions are tested directly against fixtures — no DB, network, or browser needed for
  any of them

## Before considering a feature or fix done

Run all four of the following and fix any failures:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

(CI — `.github/workflows/ci.yml` — runs the same four on every push to `main` and every PR.)

## Running

```bash
pnpm dev              # development
pnpm build && pnpm start -- -p 9877   # production (pm2 manages this)
```

See README.md for full pm2 setup instructions.

## Git workflow

- **Never commit directly to `main`.** Every phase (or standalone fix/change) gets its own
  branch and at least one PR — `git checkout -b <branch>`, commit there, `gh pr create`.
- **Conventional commits for both commit messages and PR titles** (`feat: …`, `fix: …`,
  `chore: …`, `style: …`), lowercase subject — enforced on commits by commitlint
  (`.husky/commit-msg`), and applied by convention (not enforced by tooling) to PR titles too.
