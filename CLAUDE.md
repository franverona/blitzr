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
- **Stockfish** (`stockfish` npm package, WASM "lite single-threaded" build) in a browser Web Worker

## Project structure

```
app/
  actions.ts                # all DB reads/writes + sync/analysis triggers (Server Actions)
  page.tsx                  # Today: due cards, unanalyzed games, recent accuracy, next puzzle
  games/page.tsx            # games list (paginated, filterable)
  layout.tsx                # sidebar nav + main content, reads settings cookies
  error.tsx / not-found.tsx / loading.tsx  # root fallbacks; loading streams, so `notFound()` returns 200
  games/[id]/page.tsx       # single game — replay, analysis
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
  Board.tsx                 # BoardProvider/BoardView/BoardNavControls/LiveAnalysisProvider
  LiveAnalysisPanel.tsx     # live MultiPV engine lines
  MoveSequence.tsx          # SAN line rendered with piece icons
  PlanBoard.tsx             # step-through board for an engine plan
  GameAnalysisPanel.tsx     # batch Stockfish analysis + move-quality dialog
  RepertoireBoard.tsx       # editable board that builds the repertoire tree
  DrillSession.tsx          # one drill card at a time
  PuzzleBoard.tsx           # manual, multi-ply mate-puzzle solving
  LessonPractice.tsx        # Study/Quiz toggle for a lesson; LessonQuiz.tsx is quiz mode
  SettingsProvider.tsx      # per-viewer settings context (cookie-seeded)
  BulkAnalysisProvider.tsx  # "Analyze all" run state, mounted in the root layout
  SyncProvider.tsx          # sync run state + auto-sync on open, mounted in the root layout
  GameSearchForm.tsx        # games list filters
  DateRangeFilter.tsx       # /blunders date range
  AccuracyTrendChart.tsx    # hand-rolled SVG chart on /blunders
  BoardCoordinates.tsx      # rank/file labels outside the board
  Select.tsx                # native <select> + chevron — use for every dropdown
  Dialog.tsx                # modal shell: title, ✕, backdrop click, aria-labelledby
  PageHeader.tsx / Card.tsx / TableShell.tsx  # page <h1> row, surface + SectionLabel, table frame
  Badge.tsx / IconButton.tsx / ErrorText.tsx / Spinner.tsx  # small shared primitives
  Toast.tsx                 # Toast + useToast(), portaled into the layout's #toasts region
  styles.ts                 # class helpers: buttonClass(), chipClass(), navButtonClass(), tones
  ...                       # smaller presentational components
lib/
  types.ts                  # domain types (camelCase)
  theme.ts                  # board color presets, arrow colors, animation duration
  analysis.ts               # findBlunders(), moveSwingCp(), formatEval()
  moveQuality.ts            # per-move tiers + Lichess-style accuracy
  tactics.ts / hangingPiece.ts  # tactical detectors and their descriptions
  checklist.ts              # static per-position tactic scan
  drill.ts                  # drill candidates, card hydration, SM-2
  blunders.ts / accuracyTrend.ts / openings.ts  # pure aggregations
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
```

`data/blitzr.db`, `data/backups/` and `public/stockfish/` are created at install/runtime and gitignored.

## Key conventions

- **Comments are terse** — only where needed, stating what's really important (a non-obvious why,
  a gotcha), never restating the code.
- **Server Actions** for all DB reads/writes and triggers — no API routes. They're plain POST
  endpoints, so an action storing a client-built payload checks it first (`lib/validate.ts`):
  `saveGameAnalysis()` wants one well-formed eval per position, and `addRepertoireMove()` replays
  the move from its parent and stores the server's own SAN/FEN.
- **Domain types are camelCase** (`lib/types.ts`), **DB columns snake_case** (`lib/db/types.ts`);
  the repository maps between them. Never leak snake_case past it.
- **Migrations** run idempotently in `ensureSchema()` (`lib/db/sqlite/migrate.ts`) — no version
  table. New columns are added after a `PRAGMA table_info` check, through `alter()`, which first
  copies an existing database to `data/backups/pre-migration-<time>.db`. Once per server process,
  so a migration that keeps failing and retrying doesn't pile up copies.
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
  `SectionLabel`, `TableShell`, `IconButton`, `ErrorText`, `Spinner`, `Toast` (with `useToast()`). Things rendered as a `<Link>`
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
  `undefined` in a Server Component.
- **Lesson/puzzle orientation** (`TrainingOrientation`, `lib/theme.ts`): `auto` is the side that
  plays. Lessons still pass the lesson's color as `myColor`, so the quiz tests the same side.
- **Board colors** are one of four presets (`BOARD_COLOR_PRESETS`, `lib/theme.ts`), consumed via
  `useSettings()` by every board.
- **Analysis strength** (fast/normal/deep = 150/300/1000ms per position) only affects batch
  analysis. It's the default for a game's Analyze button, which has its own picker; each
  `game_analysis` row records its `movetime_ms`.
- **Coordinates** are drawn outside the board by `BoardCoordinates`; react-chessboard's
  `showNotation` is always `false`. A sibling stretched next to the board (`EvalBar`) needs `mb-7`
  while they're on.
- **Move sounds** are hotlinked from chess.com's CDN (not redistributed), via `useMoveSound(fen)`.
- **`BOARD_ANIMATION_DURATION_MS`** (150ms) is shared by every board and the keyboard nav throttle.
- **`BoardNavControls`** binds ←/→, Space (play), Home/↑/`0` (start), End/↓ (end), `F` (flip) and Esc (exit explore)
  globally, ignoring modifier keys, form fields, and `<dialog>`s that don't set
  `data-board-shortcuts`.
- **Play** auto-advances at the `playSpeed` setting (`PLAY_SPEEDS`, 1000/500/250ms), stopping on
  the user's own blunders.
- **`BoardProvider`'s `myColor`** (defaults to `boardOrientation`) is the user's side for Play's
  stops, saved hints, `MoveList` and `LessonQuiz`. Never read `boardOrientation` as "my color" —
  it's only the view, so a flip button can't change whose moves count.
- **Game replay and lesson Study mode open on ply 1.** A game page's `?ply=` overrides it (Today
  links a blunder one ply early, so the board shows the position before it).
- **Game-end badges** (`gameEndBadges()`, `lib/gameEnd.ts`): mate/draw come from the position;
  resignations, timeouts and agreed draws from the per-player result codes, on the final ply only.
- **Beginner jargon is explained in place** (`<abbr title>` tooltips, `EvalHelp`), not removed.
- **A component seeding state from props (`useState(initialX)`) needs `key={id}`** wherever it can
  receive a different record. Exception: a filter that must survive its own navigation (the
  accuracy popover, the search text) stays out of the key and re-syncs from props during render.
- **Every `<dialog>` is a `Dialog`**, which names it by its visible `<h2>` (`aria-labelledby` to a
  `useId()`, since some dialogs render more than once per page). The caller owns the `ref` and
  `showModal()`; with `onSubmit` the body is a `<form>`.
- **react-chessboard needs a unique `options.id` (`useId()`) when two boards share a page**, and
  keys arrows by start/end square only — dedupe arrows before passing them.

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
  `puzzle_progress` (solved puzzle ids;
  the puzzles themselves are hardcoded).

## Chess.com ingestion

- `https://api.chess.com/pub`, no API key. Always send a descriptive `User-Agent`.
- A missing `CHESSCOM_USERNAME` fails soft (`hasChesscomUsername()`): the games page shows a setup
  notice instead, then an "Analyze all" hint while games exist but none is analyzed.
- Archives are fetched **serially**; 429s retry with backoff honoring `Retry-After`. The client
  drives a sync (`listArchivesToSync()`, then `syncArchiveMonth()` per month) so `SyncButton` can
  show progress; each month revalidates `/games`, and a failed month leaves earlier ones saved.
- Sync state lives in `SyncProvider` (root layout, inside `BulkAnalysisProvider`). Opening the app
  syncs once if the newest `sync_state.synced_at` is over an hour old (`isSyncStale()`; never before a
  first manual sync), silently unless it finds games. A sync that adds games offers "Analyze them".
- Incremental: `sync_state` marks months `complete`/`partial`. The current month, and the previous
  one until a full UTC day has passed (`oldestOpenArchiveYm()`), are always re-fetched.
- Ingestion is unfiltered (variants, daily, everything). Filtering happens in `app/actions.ts`:
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

## Manually-added games

`parseManualGame()` builds a `Game` from a pasted PGN's headers and throws on bad movetext or
missing players (a manual game exists to be analyzed). Its per-player result codes are Chess.com's (`resigned`, `timeout`, `agreed`…), read from the final position, then the (possibly Spanish) `Termination` header, falling back to `loss`/`draw`. It gets a fresh `crypto.randomUUID()` and
`archiveYm: 'manual'`; since `upsertGames()` is `ON CONFLICT (id) DO NOTHING`, sync can never
overwrite it. The random id also defeats `ON CONFLICT` as a duplicate check, so `findDuplicateGame()`
matches on the Chess.com game id in the URL (any of its forms) or on players plus moves: a paste
that matches an existing game is rejected, and sync skips a game that matches a pasted one,
keeping the pasted copy (with its analysis and drill cards). A `Variant` header becomes `rules` (`Chess960` → `chess960`, as Chess.com names it), so `isStandardChess()` skips it. The dialog's side picker defaults to matching the username (an error if neither
player matches). **"Not me"** stores `isMine: false` (`myColor` is then only the board
orientation): such games are skipped by every stat in `app/actions.ts` (`cachedMyStandardGames`,
`cachedStandardStartGames`), by the repertoire diff, and by the games list's result/color filters.
Only manual games can be deleted (`deleteManualGame()`); FKs cascade to analysis and drill cards.

## Repertoire

`diffGameAgainstRepertoire()` flags a **deviation** only on the user's own ply where the tree had
a prepared move. An opponent's unprepared move or the tree running out doesn't count.

## Engine analysis

- Stockfish runs **client-side only**; Server Actions only persist results. Evals are normalized
  to White's perspective. `findBlunders()` flags win-% drops (`moveWinDrop()`, the eval bar's
  curve) at least as large as 200cp from equal; `blunderSeverity()` splits Mistake/Blunder at 400cp
  from equal. `swingCp` is display-only.
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
  accuracy with the Lichess formula. No Brilliant/Great/Book tiers.

### Live analysis and exploration

- `LiveAnalysisProvider` (in `Board.tsx` to avoid a circular import) owns one long-lived engine
  and runs a MultiPV search for `displayFen`, at most one in flight. Its context exposes `lines`,
  the `fen` they were computed for, and `thinking`. `LiveAnalysisPanel` sits above the game page's
  move list (`BoardView`'s `sidebarTop`, capped at 60% of the sidebar). Hidden engine hints hide it
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
- `useLiveAnalysisContext()` returns an empty default without a provider, so `/learn` can render
  `BoardView` without spinning up an engine.

## Games list filters

All filters are URL params (`q`, `result`, `color`, `rated`, `accOp`, `accValue`). Accuracy isn't a
column, so an active accuracy filter becomes a `gameIds` set passed to `listGames()`. Text search
and the slider are debounced (400ms); selects navigate immediately.

## Drilling

`drill_cards` stores only the SM-2 schedule (binary grading); prompts are re-derived by
`buildDrillPrompt()` from deviations and own-move blunders. Deviations are one card per position
(the oldest game that left the tree there), not per game; a blunder whose best move repeats the
previous own ply's (same piece left en prise) is folded into that first card. The deck re-syncs on every `/drill` load
(`reconcileDrillDeck()`, pure) and serves the most-overdue cards (`blitzr-drill-session-size`
cookie: 10/15/25, default 15, read by `getDrillDeck()` itself). `DrillSession` snapshots its prompts
so revalidation can't reshuffle an active session, and keeps the snapshot (with position and tally)
in `sessionStorage` so a reload resumes it. Only an unfinished session under the same filters resumes;
it's read through `useSyncExternalStore`, rendering nothing until then. A blunder card also accepts a non-engine move
when a one-off client-side eval rates it good or better (`isNearBestMove()`); if the engine fails,
only the engine's move counts. **Re-analyzing a game can reset its drill progress:** another
strength can shift which plies count as blunders, and the deck sync deletes cards (with their SM-2
schedules) whose ply no longer qualifies. Accepted, not a bug.

The page's only visible filter is card type; `?opening=` has no picker (Today's weak spot links to
it) and shows as a clearable chip. The auto-advance checkbox lives on the page, not in Settings:
`blitzr-drill-auto-advance` is read by `app/drill/page.tsx` and written by `DrillSession`.

## Blunders page

`buildBlunderStats()` and `buildAccuracyTrend()` are pure aggregations merged by
`getBlunderStats()`, which applies the `?from=&to=` date range (local calendar days) to every
section. The trend chart's x-axis is game index, not date, because sessions are bursty.

## Today

`getTodaySummary()` feeds `/`, the landing page (the games list is `/games`). "Recent" means the
last 7 days throughout; the pure parts live in `lib/today.ts`. The due count goes through the same
`reconcileDrillCards()` as `getDrillDeck()`, so it matches `/drill`, and is shown against the
session size. Ratings change per time class (`recentResults()`; Chess.com never mixes them). The
weak spot is the top opening from `buildBlunderStats()` over recent games, linking to
`/drill?opening=` only if the deck has a card for it. Focus also lists the week's worst blunder
(`buildBlunderStats().worst[0]`), how the week's games were lost (`lossReasons()`, from the user's
own result code) and the opening lesson those games reached most (`suggestLesson()`, exact SAN
prefix like `countGamesReachingLine()`). The drill streak reads `drill_review_days` (one row per
local day with an answer, recorded by `submitDrillAnswer()`): `drill_cards.last_reviewed_at` keeps
only the latest review, so the table was seeded once from it and undercounts older history.

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
both sides; wrong moves retry, "Reveal" doesn't count as solved, and promotions show a piece picker
(some puzzles need underpromotion). A defence puzzle (`saves` set) is one ply: any save solves it.
`/puzzles` filters by `?kind=mate|defend`. `PromotionPicker` is shared with `DrillSession` (an engine best move
can be an underpromotion too) and explore mode.

## Lessons

- Content is hand-authored in `lib/openingTheory.ts` / `lib/endgameTheory.ts`. Every `sourceUrl`
  must be read live before citing. **Summaries are paraphrased, never copied** (Wikibooks is
  CC BY-SA, this repo is MIT).
- `countGamesReachingLine()` matches the lesson's exact SAN prefix, not Chess.com's ECO tag.
- Endgame lessons have their own `initialFen` and run to mate (or promotion), covered by
  `endgameTheory.test.ts`.

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
  fixtures — no DB, network or browser, except `sqliteRepository.test.ts` (in-memory SQLite).
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

CI (`.github/workflows/ci.yml`) runs the same five on pushes to `main` and on PRs, then
smoke-tests `pnpm start`: the main routes must return 2xx against an empty database.

## Running

```bash
pnpm dev                          # development
pnpm build && pnpm start -p 9877  # production, localhost only (pm2 manages this, see README)
```

**`pnpm build` corrupts a running `pnpm dev`'s Turbopack cache** (they share `.next/`), so the
dev server silently serves stale code. Restart it after building.

## Git workflow

- **Never commit to `main`.** Branch, commit, `gh pr create`.
- **Conventional commits** (`feat:`, `fix:`, `chore:`, `style:`, lowercase) for commit messages
  (enforced by commitlint) and PR titles (linted by `pr-title.yml`, since squash merges use them).
