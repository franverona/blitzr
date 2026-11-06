# Blitzr — Claude Code instructions

## What this is

A local, single-user chess repertoire trainer built from the owner's own Chess.com games. Public
and open-source, but scoped for one person on their own machine: no accounts, no hosted version,
no multi-user support.

Built incrementally, one feature or fix at a time — don't scaffold speculative future work.

## Stack

- **Next.js** App Router with Server Actions (`'use server'`)
  — newer than model training data; check `node_modules/next/dist/docs/` before using an API
- **SQLite** (Kysely + `better-sqlite3`) behind `getRepository()` (`lib/db/`)
- **Tailwind CSS v4**, **TypeScript**
- **chess.js** for PGN/move validation, **react-chessboard** (v5, `options` prop API) for boards
- **react-hot-toast** for toasts, with its default look replaced by our Tailwind classes
- **Stockfish** (`stockfish` npm package, WASM "lite single-threaded" build) in a browser Web Worker

`pnpm-workspace.yaml`'s `allowBuilds` lists the dependencies pnpm may run install scripts for (it
skips every other one's): `unrs-resolver` (postinstall fetching the native resolver behind
`eslint-config-next`). `better-sqlite3` is set to `false`: it loads its bundled prebuilt binary, and
building it would only run node-gyp (Python, a C++ toolchain) for nothing. `public/stockfish/` comes
from our own `postinstall` (`scripts/setup-stockfish.mjs`). A new dependency that builds on install needs adding.

Node is 22.18+ (`.nvmrc`, `engines`, the `preinstall` guard). `@types/node` stays on the same
major, so tsc rejects APIs Node 22 lacks; Dependabot ignores its majors. Bump all of them together.

## Project structure

```
app/
  actions.ts                # all DB reads/writes + sync/analysis triggers (Server Actions)
  page.tsx                  # Today: due cards, unanalyzed games, recent accuracy, next puzzle
  games/page.tsx            # games list (paginated, filterable)
  layout.tsx                # sidebar nav + main content, reads settings cookies
  error.tsx / not-found.tsx / loading.tsx  # root fallbacks; loading streams, so `notFound()` returns 200
  games/[id]/page.tsx       # single game — replay, analysis
  games/[id]/play/page.tsx  # one of its positions played against Stockfish at a chosen Elo
  openings/page.tsx         # ECO family aggregation
  learn/page.tsx            # lesson index
  learn/[slug]/page.tsx     # one lesson
  settings/page.tsx         # per-viewer preferences + static preview board
  repertoire/page.tsx       # repertoire tree builder
  drill/page.tsx            # spaced-repetition drill deck
  blunders/page.tsx         # cross-game blunder aggregate + accuracy trend
  puzzles/page.tsx          # mate-in-N puzzle list
  puzzles/[id]/page.tsx     # one puzzle
components/
  Board.tsx                 # BoardView: the board, eval bar, move list and their overlays
  EvalBar.tsx               # the vertical eval bar beside a board (deliberately not themed)
  MoveList.tsx              # the move list, with saved-analysis badges and blunder details
  BoardContext.tsx          # BoardProvider + useBoardContext(): ply, explore branch, orientation
  BoardNavControls.tsx      # ◀/▶/Play/flip buttons and their keyboard shortcuts
  LiveAnalysis.tsx          # LiveAnalysisProvider + useLiveAnalysisContext()
  GameEndBadge.tsx          # mate/flag/draw badges drawn on the final position
  LiveAnalysisPanel.tsx     # live MultiPV engine lines
  MoveSequence.tsx          # SAN line rendered with piece icons
  PlanBoard.tsx             # step-through board for an engine plan
  GameAnalysisPanel.tsx     # batch Stockfish analysis + move-quality side panel
  EvalGraph.tsx             # the eval bar across a game, inside the move-quality panel
  RepertoireBoard.tsx       # editable board that builds the repertoire tree
  RepertoireQuiz.tsx        # /repertoire?mode=quiz: one tree line from memory, via LessonQuiz
  DrillSession.tsx          # one drill card at a time
  TroubleCards.tsx          # /drill: the cards missed again and again, as positions
  PuzzleBoard.tsx           # manual, multi-ply mate-puzzle solving
  LessonPractice.tsx        # Study/Quiz toggle for a lesson; LessonQuiz.tsx is quiz mode
  PlayoutBoard.tsx          # a position played out against Stockfish (EndgamePlayout, BotPlayout)
  EndgamePlayout.tsx        # endgame lessons' Play mode: the position against Stockfish
  BotPlayout.tsx            # /games/[id]/play: the strength picker + PlayoutBoard
  SettingsProvider.tsx      # per-viewer settings context (cookie-seeded)
  BulkAnalysisProvider.tsx  # "Analyze all" run state, mounted in the root layout
  SyncProvider.tsx          # sync run state + auto-sync on open, mounted in the root layout
  SyncButton.tsx            # the games page's sync button and its per-month progress
  GameSearchForm.tsx        # games list filters
  DateRangeFilter.tsx       # /blunders date range
  BlunderStats.tsx          # /blunders: punish rate, worst blunders and the per-group tables
  AccuracyTrendChart.tsx    # hand-rolled SVG chart on /blunders
  ThrownWins.tsx            # /blunders: drawn or lost games that reached a winning position
  BoardCoordinates.tsx      # rank/file labels outside the board
  Select.tsx                # native <select> + chevron — use for every dropdown
  Dialog.tsx                # modal shell: title, ✕, backdrop click, aria-labelledby
  PageHeader.tsx / Card.tsx / TableShell.tsx  # page <h1> row, surface + SectionLabel, table frame
  Badge.tsx / IconButton.tsx / ErrorText.tsx / Spinner.tsx  # small shared primitives
  Toast.tsx                 # <Toaster />: react-hot-toast rendered with our own classes
  styles.ts                 # class helpers: buttonClass(), chipClass(), navButtonClass(), tones
  Sidebar.tsx               # collapsible nav (blitzr-sidebar-collapsed cookie)
  RouteProgressBar.tsx      # top bar during navigation (root layout); router.push() callers
                            # call startRouteProgress(), since App Router has no start event
  PositionActions.tsx       # copy FEN / PGN, open in Lichess, under the game page's nav
  PromotionPicker.tsx       # piece picker shared by puzzles, drills, playouts and explore mode
  ...                       # smaller presentational components
lib/
  types.ts                  # domain types (camelCase)
  theme.ts                  # board color presets, arrow colors, animation duration
  analysis.ts               # findBlunders(), moveSwingCp(), formatEval()
  botStrength.ts            # bot Elo levels -> Stockfish setoption commands
  moveQuality.ts            # per-move tiers + Lichess-style accuracy
  tactics.ts / hangingPiece.ts  # tactical detectors and their descriptions
  checklist.ts              # static per-position tactic scan
  drill.ts                  # drill candidates, card hydration, SM-2
  blunders.ts / accuracyTrend.ts / openings.ts / thrownWins.ts  # pure aggregations
  repertoire.ts             # diffGameAgainstRepertoire()
  positions.ts              # buildPositions(), isStandardChess()
  openingTheory.ts / endgameTheory.ts  # hand-authored lessons
  mateProblems.ts           # MateProblem type + client-safe helpers (no puzzle data)
  puzzleSet.ts              # server-only: real games + Lichess + local Polgár, getMateProblem()
  realGameMates.ts / lichessMates.json / lichessDefenses.json  # the bundled puzzles
  forcedMate.ts             # isForcedMate(), forcedMateWithin(), shared with the import scripts
  manualGame.ts             # pasted PGN -> Game
  sync.ts                   # listPendingArchives(), syncArchive()
  validate.ts               # checks on Server Action payloads the client builds
  dataDir.ts                # dataDir(): BLITZR_DATA_DIR or ./data, shared with scripts/
  today.ts                  # Today's pure parts: streak, recent results, repertoire rate, lesson
  san.ts                    # SAN helpers: piece names, move labels, plain-English moves
  gameEnd.ts                # gameEndBadges()
  share.ts                  # linePgn(), lichessAnalysisUrl()
  dates.ts / config.ts      # date formatting and bounds; CHESSCOM_USERNAME
  material.ts / legalMoves.ts / moveSound.ts  # material balance, a square's moves, which sound
  localHost.ts              # isLoopbackHost(), for proxy.ts
  i18n/                     # locale + string dictionary
  chesscom/                 # API client + normalization
  stockfish/                # UCI wrapper + batch analysis
  db/                       # getRepository(), row types, sqlite repository + migrations
scripts/
  setup-stockfish.mjs       # postinstall — copies engine files into public/stockfish/
  backup-db.mjs             # `pnpm backup` — online backup into data/backups/
  import-lichess-mates.mjs  # Lichess puzzle DB -> lib/lichessMates.json (re-runnable)
  import-lichess-defenses.mjs  # Lichess puzzle DB -> lib/lichessDefenses.json (re-runnable)
  check-defenses.mjs        # re-checks lib/lichessDefenses.json with native Stockfish
  stockfish.mjs             # native Stockfish pool for the two scripts above
  import-polgar-mates.mjs   # polgar.pgn -> data/polgar-mates.json, local only (re-runnable)
proxy.ts                    # 403 unless Host is localhost/127.0.0.1/[::1]; per-request CSP nonce
```

`data/blitzr.db`, `data/backups/` and `public/stockfish/` are created at install/runtime and gitignored.
`data/` is the default for `dataDir()` (`lib/dataDir.ts`): `BLITZR_DATA_DIR` moves the database, its
backups and `polgar-mates.json` elsewhere. The `data/` paths below assume the default. Scripts load
`.env.local` themselves (`process.loadEnvFile`), since only Next does it for the app.

## Key conventions

- **Comments are terse** — only where needed, stating what's really important (a non-obvious why,
  a gotcha), never restating the code.
- **Server Actions** for all DB reads/writes and triggers — no API routes. They're plain POST
  endpoints, so an action storing a client-built payload checks it first (`lib/validate.ts`):
  `saveGameAnalysis()` wants one well-formed eval per position, and `addRepertoireMove()` replays
  the move from its parent and stores the server's own SAN/FEN. `submitDrillAnswer()` and `markPuzzleSolved()` reject
  malformed keys or unknown puzzle ids. With no auth, they rely on both servers binding
  `127.0.0.1` and on `proxy.ts` rejecting any other `Host` (DNS rebinding sends a matching `Origin`,
  which Next's CSRF check accepts). Hosting it anywhere (#168) means changing both.
- **Domain types are camelCase** (`lib/types.ts`), **DB columns snake_case** (`lib/db/types.ts`);
  the repository maps between them. Never leak snake_case past it.
- **Migrations** run idempotently in `ensureSchema()` (`lib/db/sqlite/migrate.ts`) — no version
  table. New columns are added after a `PRAGMA table_info` check, through `alter()`, which first
  copies an existing database to `data/backups/pre-migration-<time>.db`. Once per server process,
  so a migration that keeps failing and retrying doesn't pile up copies.
  `getRepository()` keeps its instance on `globalThis` but replaces one from an older class, so a
  hot reload of the repository or its migrations takes effect in a running `pnpm dev`.
- **`moves_san` and `game_analysis.evals` are JSON array columns**, walked in app code.
- **Aggregations, repertoire diffing and blunder detection are pure functions**, not repository
  methods — backend-agnostic and unit-testable.
- **Layout:** page content sits in a `max-w-7xl` wrapper. Every board is capped by viewport height
  at `lg+` (`max-w-[min(<width>,calc(100dvh-<N>rem))]`, `N` = that page's chrome) so it fits a 13"
  laptop without scrolling — adding content above/below a board means re-measuring `N`.
- **Long text (opening names) beside a button row needs room to wrap**: the game header's column
  is `flex-1 basis-64` so the name wraps there; button rows that share space with variable-width
  (localized) labels need `flex-wrap`.
- **Page headers** (the `<h1>` row) are `PageHeader` (`title`, `subtitle`, `actions`).
- **Shared UI before new class strings:** `Dialog`, `Badge` (tones from `styles.ts`), `Card` /
  `SectionLabel`, `TableShell`, `IconButton`, `ErrorText`, `Spinner`. Toasts are react-hot-toast's `toast()` / `toast.error()`, rendered by `components/Toast.tsx`'s `<Toaster />` (root layout, inside `BulkAnalysisProvider`); pass an `id` so a newer toast from the same source replaces the last. Things rendered as a `<Link>`
  in one place and a `<button>` in another are class helpers in `components/styles.ts`
  (`buttonClass()`, `chipClass()` for filter/mode toggles, `navButtonClass()`, `LINK_CLASS`,
  `INPUT_CLASS`); it has no `'use client'`, so Server Components can import it.
- **Light/dark theme:** manual toggle stored in a `blitzr-theme` cookie (default `dark`), read in
  `app/layout.tsx` to set `.dark` on `<html>` before first paint. Every component needs an
  explicit light class alongside its `dark:` one. Light palette is muted: canvas `bg-zinc-100`,
  elevated surfaces `bg-zinc-50`. `EvalBar` is deliberately not themed.
- **Per-viewer settings** (theme, board color preset, analysis strength, hide engine hints,
  coordinates, move sounds, lesson/puzzle orientation, auto-play speed, drill session size) live in
  `SettingsProvider`, each in a `blitzr-*` cookie read server-side in `app/layout.tsx` and seeded as
  initial state. Cookies, not localStorage, because react-chessboard's square colors are
  inline-style props and must be right on first render. **Cookie names are duplicated as literals**
  in `layout.tsx` and the client modules — a constant exported from a `'use client'` module reads as
  `undefined` in a Server Component. The sidebar's collapsed state isn't a setting but follows the
  same pattern (`blitzr-sidebar-collapsed`).
- **Lesson/puzzle orientation** (`TrainingOrientation`, `lib/theme.ts`): `auto` is the side that
  plays. Lessons still pass the lesson's color as `myColor`, so the quiz tests the same side.
- **Board colors** are one of four presets (`BOARD_COLOR_PRESETS`, `lib/theme.ts`), consumed via
  `useSettings()` by every board.
- **Analysis strength** (fast/normal/deep = 150/300/1000ms per position) only affects batch
  analysis. A game's Analyze button has its own picker, defaulting to the strength of the game's
  saved analysis, else this setting; each `game_analysis` row records its `movetime_ms`.
- **Coordinates** are drawn outside the board by `BoardCoordinates`; react-chessboard's
  `showNotation` is always `false`. A sibling stretched next to the board (`EvalBar`) needs `mb-7`
  while they're on.
- **Move sounds** are hotlinked from chess.com's CDN (not redistributed), via `useMoveSound(fen)`.
- **`BOARD_ANIMATION_DURATION_MS`** (150ms) is shared by every board and the keyboard nav throttle.
- **`BoardNavControls`** binds ←/→, Space (play), Home/↑/`0` (start), End/↓ (end), `F` (flip) and Esc (exit explore)
  globally, ignoring modifier keys, form fields, and `<dialog>`s that don't set
  `data-board-shortcuts`. The Move quality panel isn't a dialog: while open, it takes Esc in the
  capture phase to close itself; the other keys still drive the board beside it.
- **Play** auto-advances at the `playSpeed` setting (`PLAY_SPEEDS`, 1000/500/250ms), stopping on
  the user's own blunders.
- **`BoardProvider`'s `myColor`** (defaults to `boardOrientation`) is the user's side for Play's
  stops, saved hints, `MoveList` and `LessonQuiz`. Never read `boardOrientation` as "my color" —
  it's only the view, so a flip button can't change whose moves count.
- **Game replay and lesson Study mode open on ply 1.** A game page's `?ply=` overrides it (Today,
  `/blunders` and the drill link a blunder one ply early, so the board shows the position before it).
  `?hints=0` (trouble cards) hides the arrow, eval bar and live panel there until the user steps
  away or moves (`BoardContext`'s `hintsHidden`), whatever the setting.
- **Game-end badges** (`gameEndBadges()`, `lib/gameEnd.ts`): mate/draw come from the position;
  resignations, timeouts and agreed draws from the per-player result codes, on the final ply only.
- **Beginner jargon is explained in place** (`<abbr title>` tooltips, `EvalHelp`), not removed.
- **A component seeding state from props (`useState(initialX)`) needs `key={id}`** wherever it can
  receive a different record. Exception: a filter that must survive its own navigation (the games
  list's filter form, so its side panel stays open) has no key and re-syncs from props during render, as
  does `GameAnalysisProvider` when a bulk run saves the open game (a new `analyzedAt`).
- **Every `<dialog>` is a `Dialog`**, which names it by its visible `<h2>` (`aria-labelledby` to a
  `useId()`, since some dialogs render more than once per page). The caller owns the `ref` and
  `showModal()`; with `onSubmit` the body is a `<form>`.
- **react-chessboard needs a unique `options.id` (`useId()`) when two boards share a page**, and
  keys arrows by start/end square only — dedupe arrows before passing them.
- **No page can be framed** (`X-Frame-Options: DENY` in `next.config.ts`, `frame-ancestors 'none'`):
  a framed page's clicks would reach Server Actions with Blitzr's own `Origin`.
- **Content-Security-Policy** is set per request in `proxy.ts`: scripts need its nonce (Next adds
  it to its own), so injected markup can't run script against the Server Actions. Every page is
  already dynamic (the layout reads cookies), so the nonce costs nothing. A new external sound,
  script or font needs adding there; images already allow any `https:`, and inline `style`
  attributes are allowed.

## Database

- `getRepository()` returns the `SqliteGameRepository` singleton; there's no backend switch.
- SQLite lives at `./data/blitzr.db`, created on first run. Delete it and re-sync to reset.
- **Backup** (Settings → Data): `exportDatabaseBackup()` returns `exportBackup()`'s
  bytes to the client, which saves them as a file. SQLite makes it with `VACUUM INTO` a temp file,
  so the copy is consistent and includes the WAL. `pnpm backup` writes one to `data/backups/` from
  the command line (`better-sqlite3`'s `db.backup()`).
- Tables: `games`, `sync_state`, `repertoire_moves` (tree per color, `ON DELETE CASCADE` to the
  subtree — needs the `foreign_keys` pragma), `game_analysis` (one row per game), `drill_cards`
  (schedule only, keyed by `(game_id, source_type, ply)`), `drill_review_days` (streak),
  `puzzle_progress` (solved puzzle ids), `puzzle_reveals` (revealed ones, Today's retry queue;
  the puzzles themselves are hardcoded).

## Chess.com ingestion

- `https://api.chess.com/pub`, no API key. Always send a descriptive `User-Agent`.
- Once games exist but none is analyzed, the games page shows an "Analyze all" hint.
- Archives are fetched **serially**; 429s retry with backoff honoring `Retry-After`. The client
  drives a sync (`listArchivesToSync()`, then `syncArchiveMonth()` per month) so `SyncButton` can
  show progress; each month revalidates `/games`, and a failed month leaves earlier ones saved.
- Sync state lives in `SyncProvider` (root layout, inside `BulkAnalysisProvider`). Opening the app
  syncs once if the newest `sync_state.synced_at` is over an hour old (`isSyncStale()`; `BLITZR_AUTO_SYNC_MINUTES` changes the hour, `0` turns
  auto-sync off but keeps the hour for Today's stale badge; never before a
  first manual sync), silently unless it finds games. A sync that adds games offers "Analyze them".
- Incremental: `sync_state` marks months `complete`/`partial`. The current month, and the previous
  one until a full UTC day has passed (`oldestOpenArchiveYm()`), are always re-fetched.
- **Lichess** (`lib/lichess/`, `https://lichess.org/api`, no token) has no monthly archives, so
  `listPendingArchives()` makes them: `lichess:YYYY-MM` keys (in `sync_state` and `archive_ym`;
  Chess.com's stay bare) from the account's `createdAt`, each fetched as NDJSON, 1000 games a request oldest first (one request for a busy month outlasts the timeout), with `since`/`until`
  on the game's _start_, `ongoing=true`, `opening=true` (else the PGN has no ECO or Opening). A month with an unfinished game stays `partial`, or that
  (correspondence) game would be missed. `normalizeLichessGame()` runs the PGN through
  `parseManualGame()` and takes `status` (resign/outoftime/timeout/draw → result codes), `speed`
  (`ultraBullet` → `bullet`), `rated` and `lastMoveAt` from the export; ids are `lichess:<id>`.
  Next hands `[id]` params over percent-encoded (`lichess%3A…`), so both game routes decode
  theirs (`decodeGameIdParam()`: a malformed escape 404s); CI's smoke test seeds a `lichess:` game to keep it that way.
  Aborted games and variants chess.js rejects (Horde, Racing Kings, Crazyhouse) are skipped. A 429
  waits a full minute, as Lichess asks. Chess.com's months sync first, then Lichess's, in one run; a site that fails to list its months gets its own error toast while the other's still sync.
- Ingestion is otherwise unfiltered (variants, daily, everything). Filtering happens in `app/actions.ts`:
  engine features need `isStandardChess()`; opening features also need
  `startsFromStandardPosition()`.
- Avatars aren't stored — fetched live (2s timeout, no 429 retries, cached in memory per
  username), failing soft to an initial-letter badge.

### API quirks

- **"Play vs Coach"** games have a `[Link]` to an unrelated game — the "View on Chess.com" link is
  hidden for them.
- **"Play Bots"** personality games never appear in the API (use "Add game by PGN").
- **"Play vs Bot"** PGNs hold a bare bot display name (e.g. "Hans") that can collide with a real
  user. `fetchBotAvatar()` tries the undocumented `<Name>-BOT` account instead. Coach names are
  real accounts and need no special handling.

## Sites

Every game has a `site` (`chesscom` | `lichess`; the column defaults existing rows to `chesscom`; a
practice game takes its source's). `siteUsername(site)` (`lib/config.ts`) reads `CHESSCOM_USERNAME` /
`LICHESS_USERNAME`; **at least one is required**: without either (`hasAnyUsername()`), the root
layout renders only `SetupScreen` (icon + how to set them), no sidebar or providers, on every route.
CI's smoke test runs with `LICHESS_USERNAME=smoke` (no avatar fetch) and checks that screen on a
second server with neither. The sidebar lists one row per set username. **Lichess has no profile
pictures**: avatars are only fetched for Chess.com games (game page, drill cards, sidebar), so
Lichess players keep `PlayerAvatar`'s letter badge. The games list's Site column is `SiteIcon`: each site's favicon, hotlinked like the move sounds (Lichess's is black, so `dark:invert`), `—` for practice games. Ratings on Today are per site and time class
(`recentResults()`), since the two scales don't compare; the site is named only when both appear.

## Manually-added games

`parseManualGame()` builds a `Game` from a pasted PGN's headers and throws on bad movetext or
missing players (a manual game exists to be analyzed). Its per-player result codes are Chess.com's (`resigned`, `timeout`, `agreed`…), read from the final position, then the (possibly Spanish) `Termination` header, falling back to `loss`/`draw`. A `Site` header that's a lichess.org game (`/<id>` or the API's `/game/<id>`) makes it a Lichess game, with the canonical `https://lichess.org/<id>` as its link, Lichess's `Opening` header as `ecoName`, and its user picked by `LICHESS_USERNAME` (`pgnSite()` decides which username `addManualGame()` passes). It gets a fresh `crypto.randomUUID()` and
`archiveYm: 'manual'`; since `upsertGames()` is `ON CONFLICT (id) DO NOTHING`, sync can never
overwrite it. The random id also defeats `ON CONFLICT` as a duplicate check, so `findDuplicateGame()`
matches on the site's game id in the URL (Chess.com's in any of its forms, or Lichess's first 8 characters, prefixed by site so they never cross; two ids decide alone, so the paste's
`Link` and `ECOUrl` are kept only as https chess.com URLs) or on players
plus moves ending within a day or so (bot rematches repeat moves): a paste
that matches an existing game is rejected, and sync skips a game that matches a pasted one,
keeping the pasted copy (with its analysis and drill cards). A `Variant` header becomes `rules` (`Chess960` → `chess960`, as Chess.com names it), so `isStandardChess()` skips it. The dialog's side picker defaults to matching the username (an error if neither
player matches). **"Not me"** stores `isMine: false` (`myColor` is then only the board
orientation): such games are skipped by every stat in `app/actions.ts` (`cachedMyStandardGames`,
`cachedStandardStartGames`), by the repertoire diff, and by the games list's result/color filters.
Only manual and practice games can be deleted (`deleteManualGame()`); FKs cascade to analysis and drill cards.

## Repertoire

`diffGameAgainstRepertoire()` flags a **deviation** only on the user's own ply where the tree had
a prepared move. An opponent's unprepared move or the tree running out doesn't count. Those two are
what `findRepertoireGaps()` lists instead, beside the tree on `/repertoire`: the top 5 spots (line in
book plus the move played next) by game count, each jumping the board to that node. They come from
the page as props, outside `RepertoireBoard`'s key, so adding a move re-sends them. The color
whose tree is shown is `?color=` (`white` unless `black`).

`?mode=quiz` swaps the builder for `RepertoireQuiz`: `repertoireLines()` (root-to-leaf, only lines
with a move of that color) played through `LessonQuiz`, from the tree's first line, then a random
one per "Next line" (not on the first render, which would hydrate differently).

## Engine analysis

- Stockfish runs **client-side only**; Server Actions only persist results. Evals are normalized
  to White's perspective. `findBlunders()` flags win-% drops (`moveWinDrop()`, the eval bar's
  curve) at least as large as 200cp from equal; `blunderSeverity()` splits them into
  Serious/Severe at 400cp from equal, a separate scale from `lib/moveQuality.ts`'s mistake/blunder
  tiers. `swingCp` is display-only.
- Bulk "Analyze all" state lives in `BulkAnalysisProvider` (root layout) so a run survives
  navigation. Cancel is checked between games, so an in-flight game always finishes and saves.
  While a run is active, `beforeunload` asks before the tab closes.
- The games list's accuracy/error columns come from `getGameAccuracyById()` (not a `Game` field);
  `saveGameAnalysis()` revalidates `/games` so they update during a bulk run.
- Tactical explanations (`lib/tactics.ts`, `lib/hangingPiece.ts`) are deliberately narrow:
  one-ply lookback, no exchange evaluation, absolute pins only. `detectBlunderReason()` is the
  entry point; `describeBetterMove()` explains the engine's move and appends its plan.
  `hangingSquares()` flags a piece that's undefended, or defended but attacked by a cheaper piece
  (`HangingPieceReason.attacker`). That second case ranks after forks and skewers, in both
  `detectBlunderReason()` and `explainBestMove()`: a forking knight is also a cheaper attacker of
  each target, and the fork is the better explanation.
- `lib/moveQuality.ts` tiers each move (its blunder cutoff matches `findBlunders()`) and scores
  accuracy with the Lichess formula. Given the positions, `summarizeMoveQuality()` also splits it by
  `gamePhase()`; only the Move quality panel asks, since building positions replays the game (too
  slow across every game on `/blunders`, see #304). No Brilliant/Great/Book tiers.
  A side that never moved (a timeout before the first move) has `accuracy: null`, so the trend,
  Today and the games list's column and filter skip it rather than count a 100.

### Live analysis and exploration

- `LiveAnalysisProvider` (`LiveAnalysis.tsx`) owns one long-lived engine
  and runs a MultiPV search for `displayFen`, at most one in flight. Its context exposes `lines`,
  the `fen` they were computed for, and `thinking`; a mate or stalemate isn't searched (no PV),
  `terminalEval()` scores it as `terminal` for the eval bar. `LiveAnalysisPanel` sits above the
  game page's move list (`BoardView`'s `sidebarTop`, capped at 60% of the sidebar). Hidden engine hints hide it
  too, except while exploring; the engine idles exactly when it's hidden.
- The best-move arrow only draws when `fen === displayFen`; the eval bar shows the latest result
  regardless, to avoid blinking. Saved analysis wins on the recorded game; live is the fallback
  and the only source while exploring.
- Explore mode is a separate branch in `BoardContext` (`explorePath`/`explorePly`), never persisted.
  The ◀/▶ nav follows it; Play and the saved-analysis hints are off while exploring.
  `playExploreLine()` replays an engine line onto the branch, stopping at the first illegal move.
  With `BoardView`'s `autoExplore` (game page only, not lessons), moving a piece on the recorded
  game enters explore mode from that ply; Esc (`BoardNavControls`) or the indicator under the
  board leaves it.
- `PositionActions` (game page, under the nav controls) copies the FEN on screen and the game's
  PGN, or the explored line's PGN (`linePgn()`) while exploring, and links to Lichess analysis.
  Its **Play from here** (recorded plies only, not on a finished position) opens
  `/games/<id>/play?ply=`.
- `useLiveAnalysisContext()` returns an empty default without a provider, so `/learn` can render
  `BoardView` without spinning up an engine.

### Play vs bot

`/games/[id]/play?ply=&elo=` rebuilds the position from the stored game (the URL never carries a
FEN) and plays it in `PlayoutBoard` against Stockfish, the user on `myColor` (a "not me" game: the
side to move); the engine moves first when it's its turn. `BOT_ELOS` (`lib/botStrength.ts`):
1400+ is `UCI_LimitStrength` + `UCI_Elo` (Stockfish's floor is 1320); 800/1000/1200 use
`Skill Level` with a guessed mapping, labeled `~`. `StockfishEngine.configure()` sends the options
once, before the first search. The picker sits in `PlayoutBoard`'s sidebar above the move list
(click a move, ◀/▶ under it or ←/→/Home/End to look back; moving needs the live position) and
is disabled from the user's first move until the game ends, since changing it reloads the page.
With a sidebar, `PlayoutBoard` also moves the status line and its buttons (icons, labels as
`aria-label`/tooltip) there, so the board column is only the board; the page skips `PageHeader` for
one quiet line, letting the board grow to the viewport height. **Take back** returns to the user's last move, dropping the engine's reply or its running search
(`gameRef`); only mid-game: a finished game is final.

### Practice games

A game against the bot is saved when it ends (`savePracticeGame()`), unless the user never moved.
The client sends only the source game id, ply, moves, Elo and whether it resigned:
`buildPracticeGame()` (`lib/practiceGame.ts`, pure) rebuilds the start with `practiceStart()` (also
the play page's position and side), replays every move, and runs the PGN through
`parseManualGame()` for result codes. It's a `Game` with `archiveYm: 'practice'`, `timeClass:
'practice'` and `practiceOf` (`source_game_id` + `source_ply`, `ON DELETE CASCADE` to the source).

**They count nowhere**: `listAllGames()` and `listGames()` leave them out, and every stat, the drill
deck, Today, `getUnanalyzedGames()` (so "Analyze all"), sync's duplicate check and the games list
read through those two. Never read `games` around them. `getGame()` still finds them (game page,
analysis, delete). They show on their source game's page (`listPracticeGames()`), under
`/games?practice=1`, and on their own page, which links back and to Play again; a practice game
can't be practiced from (`Play from here` is hidden, the play page 404s), since its positions aren't
in a game the user played.

## Games list filters

All filters are URL params (`q`, `result`, `color`, `rated`, `site`, `accOp`, `accValue`, `practice`). The site select shows only once games come from more than one site (`getGameSites()`), or while one is set. Accuracy isn't a
column, so an active accuracy filter becomes a `gameIds` set passed to `listGames()`. Text search
and the slider are debounced (400ms); selects navigate immediately. Only the search box sits in the
row: every other filter is in the side panel behind **Filters** (`Dialog` with `placement="right"`),
which shows the active count; the site filter is a toggle of the two favicons (pressed again, it
clears).

`practice=1` lists only practice games: no rated or accuracy filter (`getGameAccuracyById()` skips
them, so the page asks `getPracticeAccuracyById()` for the listed ones), plus checkboxes whose
selection turns the header into a "Delete N selected" (`deletePracticeGames()`, which ignores any
id that isn't a practice game). The labels stay, transparent, so the columns don't move.

## Drilling

`drill_cards` stores only the SM-2 schedule (binary grading; a right answer after the hint shows
the move's square counts as wrong); prompts are re-derived by
`buildDrillPrompt()` from deviations, own-move blunders and missed punishments (`findPunishCandidates()`:
the user's reply to an opponent's blunder that wasn't `isNearBestMove()`, unless the reply was itself
a blunder, which its blunder card covers; its prompt's `opponentMistake` is `detectBlunderReason()` on
the opponent's move, shown with the first hint) and missed mates (`findMissedMateCandidates()`: an own
move from a forced mate in 3 or fewer to no mate, on a ply no blunder or punish card covers; the
win-% curve saturates at mate, so neither sees it, and an alternative answer must still mate,
`keepsForcedMate()`). Deviations are one card per position
(the game that already holds the card, else the oldest that left the tree there, so pasting an
older game doesn't reset its schedule), not per game; a blunder whose best move repeats the
previous own ply's (same piece left en prise) is folded into that first card. A review's `dueAt` is the start of a local day, so "tomorrow" means
the next morning's session. The deck re-syncs on every `/drill` load
(`reconcileDrillDeck()`, pure) and serves the most-overdue cards (`blitzr-drill-session-size`
cookie: 10/15/25, default 15, read by `getDrillDeck()` itself). `DrillSession` snapshots its prompts
so revalidation can't reshuffle an active session (a missed card, `helped` included, is appended
to it once as an ungraded `retry`: no save, tally or Undo), and keeps the snapshot (with position and tally)
in `sessionStorage` so a reload resumes it. Only an unfinished session under the same filters resumes;
it's read through `useSyncExternalStore`, rendering nothing until then. A blunder card also accepts a non-engine move
when a one-off client-side eval rates it good or better (`isNearBestMove()`); if the engine fails,
only the engine's move counts. After a miss, `describeBetterMove()` explains the engine's move (not
on deviation cards) with a `PlanBoardButton`, so the session's keys ignore events from a `<dialog>`.
**Re-analyzing a game can reset its drill progress:** another
strength can shift which plies count as blunders, and the deck sync deletes cards (with their SM-2
schedules) whose ply no longer qualifies. Accepted, not a bug.

**Trouble cards** (`troubleCards()`): up to 5 cards under the page's filters, due or not, with
an ease below 2.25 (a miss costs 0.2 and a hit gains 0.1, so 2·misses − hits ≥ 3), lowest first,
shown under the session without their answers. They link with `?hints=0`, so the game page doesn't
show the engine's move either.

**Undo** (`undoDrillAnswer()`) restores the schedule `submitDrillAnswer()` returned, only while that
answer is still the card's `last_reviewed_at` and only before Next; the streak keeps the day. An answer to a
card that's gone (a resumed session outliving its game or a deck sync) isn't saved at all.

The page's only visible filter is card type (`?type=`); `?opening=` has no picker (Today's weak
spot links to it) and shows as a clearable chip. The auto-advance checkbox lives on the page, not in Settings:
`blitzr-drill-auto-advance` is read by `app/drill/page.tsx` and written by `DrillSession`.

## Blunders page

`buildBlunderStats()`, `buildAccuracyTrend()` and `findThrownWins()` are pure aggregations merged by
`getBlunderStats()`, which applies the `?from=&to=` date range (local calendar days) to every
section. `byOpening` groups by family label, each ECO code named by its most common one over every own
game (`openingFamilyLabels()`), so Chess.com's and Lichess's names for an opening meet; `/drill?opening=`
and Today's weak spot use the same labels. The trend chart's x-axis is game index, not date, because sessions are bursty. `byReason`
runs `detectBlunderReason()` on every own blunder (the worst list only on its top 10), so it's as
narrow as that detector: most blunders land in "no simple pattern". `punish` counts the
opponent's blunders the user got to answer and the replies `isNearBestMove()` accepts, the same
bar as `findPunishCandidates()` (which also leaves out replies that were blunders themselves, so
it finds fewer). `byPhase`
uses `gamePhase()` (`lib/material.ts`): an endgame once at most 6 queens, rooks and minor pieces
are left (Lichess's divider count), else the first 10 moves (the FEN's fullmove number, so a game
from a FEN counts from there) are the opening; listed in game order. `findThrownWins()`
(`lib/thrownWins.ts`) lists drawn or lost games whose own win chance (`evalBarPercent()`) peaked at
90%+, linking to that position and to the own move after it with the biggest `moveWinDrop()` (one
ply early, like the other blunder links); it renders outside `BlunderStats`' early returns, since a game can be
thrown without a blunder.

## Today

`getTodaySummary()` feeds `/`, the landing page (the games list is `/games`). "Recent" means the
last 7 days, except for the repertoire rate; the pure parts live in `lib/today.ts`. The due count goes through the same
`reconcileDrillCards()` as `getDrillDeck()`, so it matches `/drill`, and is shown against the
session size. Ratings change per time class (`recentResults()`; Chess.com never mixes them). The
weak spot is the top opening family from `buildBlunderStats()` over recent games, linking to
`/drill?opening=` only if the deck has a card for it. Focus also lists the week's worst blunder
(`buildBlunderStats().worst[0]`), the deck's trouble-card count (`troubleCards()` uncapped, linking
to `/drill`), how the week's games were lost (`lossReasons()`, from the user's
own result code) and the opening lesson those games reached most (`suggestLesson()`, exact SAN
prefix like `countGamesReachingLine()`). The repertoire rate (`repertoireDeviations()`) is how many
of the 10 newest games with a repertoire for their color left it, with no date window. The last game shows its final position, own accuracy
and a link to its first own blunder (`gameReview()`). The drill streak reads `drill_review_days` (one row per
local day with an answer, recorded by `submitDrillAnswer()`): `drill_cards.last_reviewed_at` keeps
only the latest review, so the table was seeded once from it and undercounts older history. `drillWeek()` turns the same days
into the 7-day strip beside the streak.

## Puzzles

`lib/puzzleSet.ts` (server only) merges four sets, in this order and id range:

- **Real games** (`lib/realGameMates.ts`, ids 1–221).
- **Polgár** (ids 222–2427), **local only**: the book is copyrighted, so
  `scripts/import-polgar-mates.mjs` writes it to the gitignored `data/polgar-mates.json`, read once
  per server process when present.
- **Lichess** (`lib/lichessMates.json`, ids 10001+), CC0, picked by
  `scripts/import-lichess-mates.mjs`: 600/900/500 mate-in-1/2/3, popular and settled, spread across
  ratings and sorted easy to hard. Puzzles whose last move has a second mate are skipped, since the
  board accepts only the listed line.
- **Lichess defences** (`lib/lichessDefenses.json`, ids 20001+), picked by
  `scripts/import-lichess-defenses.mjs` from the position one move before a Lichess mate-in-1/2
  (up to 500 each; currently 258/239): the defender to move, already threatened (in check, or
  passing would allow mate), with only 1–2 moves that stop mate in `mateIn` or fewer (`saves`) and
  at least 3 that don't. Proving a move safe uses `forcedMateWithin()`, which returns `undefined`
  when the search budget runs out; any such position is dropped, so a losing move never passes as
  a save. A save that only delays mate past `mateIn` still counts, but a native Stockfish
  (`scripts/stockfish.mjs`, `brew install stockfish`) drops puzzles where every save does. `moves`
  holds the game's losing move and the mate that followed, shown after solving.
  `scripts/check-defenses.mjs` re-checks every legal move against Stockfish.

Ids key `puzzle_progress`, so the scripts keep an existing puzzle's id when re-run. Client code
imports only `lib/mateProblems.ts` (type and helpers) so the puzzles never ship to the browser; a
page passes the one it shows as a prop. Every line was verified to mate; mate-in-2/3 also with
`isForcedMate()`, which the tests re-check on a random sample (a full pass takes hours). Side to
move is read from each FEN (about a third are Black). `PuzzleBoard` makes the user play every ply,
both sides; wrong moves retry, "Reveal" doesn't count as solved (it records the id in
`puzzle_reveals`, and Today's next puzzle is the oldest revealed one never solved, so revealing a solved puzzle again doesn't queue it), and promotions show a piece picker
(some puzzles need underpromotion). A defence puzzle (`saves` set) is one ply: any save solves it.
`/puzzles` filters by `?status=solved|unsolved`, `?color=white|black`, `?kind=mate|defend` and `?mateIn=`. `PromotionPicker` is shared with `DrillSession` (an engine best move
can be an underpromotion too) and explore mode.

## Lessons

- Content is hand-authored in `lib/openingTheory.ts` / `lib/endgameTheory.ts`. Every `sourceUrl`
  must be read live before citing. **Summaries are paraphrased, never copied** (Wikibooks is
  CC BY-SA, this repo is MIT).
- `countGamesReachingLine()` matches the lesson's exact SAN prefix, not Chess.com's ECO tag.
- `addLessonToRepertoire(slug)` adds an opening lesson's line to its `primaryColor` tree through
  `lineToRepertoireNodes()` (pure: follows matching nodes, branches after). It takes only the slug,
  so the moves come from the server's lesson data, not the client.
- Endgame lessons have their own `initialFen` and run to mate (or promotion), covered by
  `endgameTheory.test.ts`. Their **Play** mode (`EndgamePlayout`) starts there with the lesson's
  side against Stockfish (300ms a move, one search at a time); won at mate, or at promotion when
  the lesson's line ends in one, drawn by any draw.

## Position checklist

`buildPositionChecklist(fen)` scans a static position for both sides (unlike the diff-based
`detect*()` functions), capped at 3 findings per side, skipping hanging pieces already explained
by a fork/skewer. Findings are only drawn on the board (no text panel), and not while exploring.

## i18n

English and Spanish via `NEXT_PUBLIC_LOCALE` (rebuild to change). `es` is typed against
`typeof en`, so missing keys fail `tsc`. Parameterized strings are functions. SAN, square names
and Chess.com's `ecoName` are never translated. Description generators take an optional trailing
`locale` param; Spanish articles go through `pieceWithArticle()`. User-facing errors come from the
dictionary too, and Server Actions **return** them (`{ ok: false, error }`) rather than throw,
since Next redacts thrown messages in production.

## Testing

- **Vitest** (`pnpm test`). Tests live in `__tests__/`, one file per `lib/` module, against
  fixtures — no DB, network or browser, except `sqliteRepository.test.ts` (in-memory SQLite) and
  `migrate.test.ts` (a SQLite file in a temp dir, for the pre-migration backup).
  `sync.test.ts` stubs the Chess.com client and repository with `vi.mock`.
- Worker-driven code (`evaluate()`, `analyzeGame()`) isn't unit-tested; its pure parsers are.

## Before considering a feature or fix done

```bash
pnpm format:check
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

CI (`.github/workflows/ci.yml`) runs the same five on pushes to `main` and on PRs, after
`pnpm audit --prod` (dev tooling's advisories don't block). Then it smoke-tests `pnpm start`: the
main routes must return 2xx against an empty database, a seeded `/games/smoke`, two lessons and a
puzzle from each Lichess set must show their content, the game's seeded analysis and trouble card
must show on `/blunders`, `/drill` and `/`, a foreign `Host` must get 403 and `/` must send
`X-Frame-Options` and a CSP
nonce, and the server log must have no `⨯` errors (a page that throws still answers 200, since
`loading.tsx` streams). Then it loads every `lib/` file a script imports under plain Node (type
stripping rejects enums, parameter properties and imports without `.ts`, which tsc allows), and
`pnpm backup` backs up that database. Each push to `main` gets its own full run; a PR's newer push
cancels its older one.

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
