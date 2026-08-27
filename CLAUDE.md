# Blitzr — Claude Code instructions

## What this is

A local, single-user chess repertoire trainer built from the owner's own Chess.com games.
Public, open-source, but scoped for one person running it on their own machine. No accounts,
no hosted version, no multi-user support.

Built incrementally, one feature or fix at a time, driven by what's actually asked for — don't
scaffold speculative future work ahead of time.

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
  actions.ts              # all DB reads/writes + sync/analysis triggers (Server Actions)
  page.tsx                 # games list (paginated)
  layout.tsx                # sidebar nav + main content
  globals.css
  games/[id]/page.tsx        # single game — board replay, repertoire diff, analysis panel
  openings/page.tsx           # ECO family aggregation
  learn/page.tsx                # opening-lesson index
  learn/[slug]/page.tsx           # one lesson
  repertoire/page.tsx          # repertoire tree builder
  drill/page.tsx                # spaced-repetition drill deck
  blunders/page.tsx              # cross-game blunder aggregate
components/
  GameList.tsx / GameRow.tsx  # games table
  Board.tsx                    # read-only replay board (BoardProvider/BoardNavControls/BoardView)
  EvalBar.tsx                   # eval fill bar next to the board
  RepertoireBoard.tsx            # editable board that builds the repertoire tree
  RepertoireTree.tsx               # move-tree view with branch switching
  GameAnalysisPanel.tsx              # Stockfish trigger + results dialog
  PositionChecklist.tsx                # live hanging-piece/fork/pin/skewer scan of the current ply
  DrillSession.tsx                     # one drill card at a time
  DrillFilters.tsx                       # sourceType tabs + opening select
  LessonPractice.tsx                     # Study/Quiz toggle for a /learn lesson
  LessonQuiz.tsx                           # active-recall quiz on a lesson's line
  MoveExplanation.tsx                       # per-move note for the lesson currently on the board
  AboutOpeningButton.tsx                      # lesson summary + source link dialog
  FlipBoardButton.tsx                           # flips board orientation on a lesson
  MiniBoard.tsx                                   # small board preview for /learn index cards
  BlunderStats.tsx                       # by-opening/by-piece/worst-blunders aggregate view
  EvalHelp.tsx                             # shared eval/blunder/swing/tactics glossary
  BlunderSeverityBadge.tsx                   # Mistake/Blunder severity pill
  LegalMoveSquare.tsx                    # legal-move dot/ring/selected square highlighting
  OpeningsTable.tsx                    # family/line aggregation table
  PieceGlyph.tsx / PieceMoveLabel.tsx    # chess piece SVGs
  KnightGlyph.tsx / KnightIcon.tsx         # favicon/side-badge knight icon
  PlayerAvatar.tsx                           # Chess.com profile avatar, initial-letter fallback
  NavLinks.tsx                                 # active-tab nav
  SyncButton.tsx                                  # triggers the sync Server Action
  BulkAnalyzeButton.tsx                              # "Analyze all" across unanalyzed games
  AddPgnButton.tsx                                     # paste-PGN dialog -> addManualGame()
lib/
  config.ts                # getChesscomUsername()
  theme.ts                  # shared board/arrow color constants
  types.ts                  # domain types
  dates.ts                   # formatDate/formatDateTime — hand-formatted, not Intl
  san.ts                       # SAN/move-number display helpers, describeMove()
  material.ts                    # materialDiff()/formatMaterialDiff()
  hangingPiece.ts                # detectHangingPiece()/hangingSquares()/describe*()
  tactics.ts                     # detectFork()/detectSkewer()/detectPin()/describe*(), detectBlunderReason()
  checklist.ts                   # buildPositionChecklist() — static per-position tactic scan
  legalMoves.ts                 # legalDestinations(fen, square)
  positions.ts                  # buildPositions() — movesSan into a FEN-per-ply array
  openings.ts                    # buildOpeningFamilies() — pure aggregation
  openingTheory.ts                 # OPENING_LESSONS/getOpeningLesson()/countGamesReachingLine()
  endgameTheory.ts                 # ENDGAME_LESSONS/getEndgameLesson()
  repertoire.ts                    # buildRepertoireIndex(), diffGameAgainstRepertoire()
  analysis.ts                       # findBlunders(), biggestBlunder(), formatEval()
  drill.ts                           # candidate-finding, card hydration, SM-2 scheduling
  blunders.ts                          # buildBlunderStats() — pure aggregation
  sync.ts                            # syncAllArchives()
  manualGame.ts                        # parseManualGame() — pasted PGN -> Game
  i18n/
    locale.ts                # Locale type, getLocale() — reads NEXT_PUBLIC_LOCALE
    strings.ts                 # UI string dictionary, getStrings()
  chesscom/
    client.ts                        # fetchArchives, fetchArchiveMonth
    normalize.ts                       # raw Chess.com game -> Game, parsePgnHeaders()
  stockfish/
    client.ts                        # StockfishEngine — thin UCI wrapper around the Worker
    analyze.ts                        # analyzeGame()/analyzeGames(), terminalEval()
  db/
    index.ts                # barrel: export { getRepository }
    factory.ts                # getRepository() — reads DB_TYPE, dispatches to a backend
    types.ts                   # Kysely DbSchema + GameRepository interface + DbType
    sqlite/
      connection.ts             # better-sqlite3 + Kysely singleton
      migrate.ts                  # ensureSchema() — DDL, idempotent
      repository.ts                 # SqliteGameRepository — camelCase <-> snake_case mapping
      index.ts                       # getSqliteRepository()
scripts/
  setup-stockfish.mjs      # postinstall — copies the engine .js/.wasm into public/stockfish/
data/
  blitzr.db             # created at runtime, gitignored
public/
  stockfish/            # copied by scripts/setup-stockfish.mjs, gitignored (~7MB .wasm)
```

## Key conventions

Implementation-level rationale (why a specific file does what it does) lives as comments in that
file, not here — this section is only cross-cutting rules that span multiple files.

- **Page content is centered in a `max-w-7xl` wrapper inside `<main>`** (`app/layout.tsx`),
  matching chess.com's layout on wide screens; below that width it's a no-op. `BoardView`'s
  board+sidebar row additionally needs `lg:justify-center` (a flex row packs children left
  otherwise) and its board column needs the same `boardMaxWidthClassName` cap as the board
  itself — without that cap, long suggestion text can widen the column and shift the whole row
  sideways between plies.
- **A long, unbreakable text line (an opening name, etc.) needs its own full-width row** — sharing
  a flex row with fixed-content siblings (nav buttons, badges) starves them of space and forces an
  overflow instead of a wrap. `app/games/[id]/page.tsx`'s `OpeningLine` was pulled out of
  `GameHeader` (which shares its row with the board's nav/explore/analyze buttons) for exactly this
  reason — a long opening name there broke that row at moderate viewport widths. That button row
  itself also needs `flex-wrap` (`justify-end` so a wrapped second line still hugs the right edge)
  — three variable-width controls (nav cluster, explore toggle, analyze button, the last two
  Spanish-locale-dependent) in a non-wrapping row overflow well before mobile width; without it,
  a button's own text wraps mid-label instead of the row wrapping between buttons.
- **Server Actions** for all DB reads/writes and the sync/analysis triggers — no API routes.
- **Domain types are camelCase** (`lib/types.ts`); **DB columns are snake_case**
  (`lib/db/types.ts`). Each repository implementation maps between them explicitly — never leak
  snake_case past the repository layer.
- **Migrations** run idempotently in `ensureSchema()` (`lib/db/sqlite/migrate.ts`) — no
  migration-version table.
- **`moves_san` and `game_analysis.evals` are JSON array columns, not ply-indexed tables** —
  everything walks the array in application code; nothing queries at ply granularity in SQL.
- **Openings aggregation, repertoire diffing, and blunder detection are pure functions**, not
  repository methods — backend-agnostic and directly unit-testable.
- **Board colors and animation timing have one source of truth**: `lib/theme.ts` for
  react-chessboard props a Tailwind class can't reach, and the `accent` Tailwind color
  (`app/globals.css`) for everywhere a className can. `BOARD_ANIMATION_DURATION_MS` (150ms,
  vs. react-chessboard's 300ms default) minimizes how long a captured piece visibly overlaps its
  capturer; every board in the app (`Board.tsx`, `PlanBoard.tsx`, `RepertoireBoard.tsx`) shares it.
- **`BoardNavControls`** binds arrow keys to prev/next, Space to Play/Pause, and `0` to Start —
  globally, throttled to `BOARD_ANIMATION_DURATION_MS` so rapid input can't cut an animation
  short. Mounted only on `games/[id]` and `/learn`'s Study mode (not Quiz mode).
- **Play auto-advances one ply every `PLAY_INTERVAL_MS`, stopping on a blunder ply**
  (`findBlunders()`) or at the end of the game. `ply`/`isPlaying` are mirrored into refs so the
  interval/keydown callbacks read fresh values without becoming effect dependencies, and so
  `setPly`/`setIsPlaying` are never called from inside each other's updater functions (React
  flags that as updating one component's state while rendering another's).
- **The game replay page and `/learn`'s Study mode open on ply 1**, not ply 0 (empty board) or
  the last ply — `BoardProvider`'s `initialPly` prop, clamped to a real `lastPly`.
- **Beginner-facing jargon is explained in place**, not simplified away — `<abbr title="...">`
  tooltips and `EvalHelp`'s glossary.
- **A component that seeds state with `useState(initialX)` needs `key={id}`** wherever the same
  instance can receive new props for a different record (`GameAnalysisProvider`/`BoardProvider`
  keyed on `game.id`, `LessonPractice`/`DrillSession` keyed on `lesson.slug`/filter values) —
  otherwise switching records shows stale state instead of the new props.

## Database backend

- **`DB_TYPE`** env var selects the backend. Defaults to `sqlite` (zero-config). Only `sqlite`
  is implemented; `lib/db/factory.ts` throws a clear error for anything else.
- **To add a new backend** (e.g. Postgres): implement `GameRepository` (`lib/db/types.ts`) in a
  new `lib/db/<backend>/` directory (mirror `lib/db/sqlite/`), then register it in
  `lib/db/factory.ts`'s `switch`.
- SQLite lives at `./data/blitzr.db`, created automatically on first run. To reset, delete the
  file and re-sync.
- Tables: `games`, `sync_state`, `repertoire_moves` (branching tree per color, `ON DELETE
CASCADE` from a node to its subtree — requires the `foreign_keys` pragma), `game_analysis`
  (one row per analyzed game, keyed by `game_id`), `drill_cards` (spaced-repetition schedule
  only, keyed by `(game_id, source_type, ply)`, `ON DELETE CASCADE` on `game_id`).

## Chess.com ingestion

- Base URL `https://api.chess.com/pub`, no API key. Every request sends a descriptive
  `User-Agent` (`lib/chesscom/client.ts`) — Chess.com throttles requests without one.
- Archives are fetched **serially**, never `Promise.all` — `lib/sync.ts`'s `syncAllArchives()`.
  429s are retried with backoff honoring `Retry-After`.
- **Incremental sync**: `sync_state` tracks each archive month as `complete` or `partial`. The
  current month is always re-fetched since it can still gain new games.
- Ingestion is deliberately unfiltered — variants, daily games, everything syncs. Filtering what
  counts toward the repertoire is a UI/analysis-layer decision, not an ingestion-time one.
- **Player avatars aren't synced/stored** — `fetchPlayerAvatar()` hits the Chess.com API live on
  every game page view, swallows any failure, and returns `null` (`PlayerAvatar.tsx` falls back
  to an initial-letter badge).

### Known Chess.com API quirks

- **"Play vs Coach" bot games have a broken `url`/PGN `[Link]`** pointing to an unrelated random
  game — no correct link is derivable, so `app/games/[id]/page.tsx` hides the "View on
  Chess.com" link when the PGN's `[Event]` header is `"Play vs Coach"`.
- **"Play Bots" personality games don't appear in the public API at all** — nothing to sync,
  nothing to fix. (They can still be analyzed via "Manually-added games" below.)
- **"Play vs Bot" opponents' PGN username is a bare bot-personality display name** (e.g. "Hans"),
  not a real account — looking it up directly for an avatar risks matching an unrelated real user
  of the same name (confirmed live: a real user is registered as plain "hans").
  `isBareBotNameEvent()` (`lib/chesscom/normalize.ts`) flags this case; `fetchBotAvatar()`
  (`lib/chesscom/client.ts`) tries Chess.com's observed (undocumented) `<Name>-BOT` account
  convention for the affected side instead, falling back to no avatar rather than trusting a bad
  match. **"Play vs Coach" is deliberately excluded** — its header (e.g. "Coach-DrWolf") already
  _is_ the coach's real dedicated account and resolves correctly as-is (confirmed live).

## Manually-added games

Some games never reach the synced `games` table because Chess.com's public API doesn't expose
them at all ("Play Bots" personality games — see the quirk above). `parseManualGame()`
(`lib/manualGame.ts`) builds a `Game` straight from a pasted PGN's own headers, mirroring
`normalizeGame()`'s field mapping but throwing on unparseable movetext or a missing White/Black
header rather than silently keeping `movesSan: null` — a manually-added game exists specifically
to be analyzed, so a dead entry isn't useful; better to reject at input time. The `addManualGame()`
Server Action (`app/actions.ts`) saves it via the existing `upsertGames()` — no new repository
method or schema change was needed.

Sync-safety is structural, not a new guarantee: each manual game gets a fresh
`crypto.randomUUID()` id, and `upsertGames()` already does `INSERT ... ON CONFLICT (id) DO
NOTHING` — sync only ever inserts ids it hasn't seen, never updates or deletes an existing row, so
a manual game can't be overwritten or lost by a later `syncGames()`. `archiveYm` is set to the
sentinel `'manual'`, which is inert everywhere except sync's own archive-status bookkeeping.

`AddPgnButton` (paste-PGN dialog, same native-`<dialog>` convention as `AboutOpeningButton`) on
the games page triggers this and redirects to the new game's page on success. The "View on
Chess.com" link on `app/games/[id]/page.tsx` only renders when `game.url` is non-empty — a
manually-added game only has one if its pasted PGN carried a `[Link]` header.

## Repertoire

A branching tree per color (`repertoire_moves`), built interactively on `/repertoire`
(`RepertoireBoard.tsx`) by playing moves on an editable board. `diffGameAgainstRepertoire()`
(`lib/repertoire.ts`) flags a **deviation** only when the mismatch is on the user's own ply and
the tree had a prepared child there — an opponent's unprepared try, or the tree simply running
out, doesn't count. Live hanging-piece/fork warnings while building the tree reuse
`detectBlunderReason()` (`lib/tactics.ts`).

## Engine analysis

Stockfish runs **client-side only**, in a Web Worker — Server Actions only persist results,
never run the engine. `StockfishEngine` (`lib/stockfish/client.ts`) normalizes every eval to
White's perspective; bulk "Analyze all" shares a single engine instance across every game.
`findBlunders()` flags any 200cp+ swing.

Bulk "Analyze all"'s run state (progress, the running loop itself) lives in
`BulkAnalysisProvider` (`components/BulkAnalysisProvider.tsx`), mounted once in the root layout
rather than owned by the games-page button — a run started there needs to keep going, and stay
visible via `BulkAnalysisIndicator` in the sidebar, after the user navigates to another page,
not get cancelled the moment its trigger unmounts. `analyzeGames()` (`lib/stockfish/analyze.ts`)
only checks its `shouldContinue` callback between games, so Cancel always lets an in-flight game
finish and save rather than abandoning a partial result. The games list's "Analyzed" column
(`listAnalyzedGameIds()`, `app/actions.ts`) is a separate lookup from `Game` itself — kept out of
that domain type since most callers (openings aggregation, etc.) have no use for it — and
`saveGameAnalysis()` revalidates `/` too, not just the game page and `/blunders`, so the column
updates live while a bulk run is in progress instead of needing a manual refresh.

Plain-English explanations layer on top: `describeMove()` (`lib/san.ts`) turns a SAN move into a
sentence; `detectHangingPiece()`/`detectFork()`/`detectSkewer()`/`detectPin()`
(`lib/hangingPiece.ts`/`lib/tactics.ts`) say _why_ a move was a blunder — deliberately narrow v1
heuristics (no static-exchange evaluation, no relative pins, one-ply lookback only).
`detectBlunderReason()` combines them in priority order and is what every call site actually
uses. `explainBestMove()`/`describeBetterMove()` apply the same detectors to the engine's
suggested move instead of the one played. See `lib/tactics.ts`'s own comments for the FEN/ray-
casting tricks involved — worth reading before touching that file.

Not every better move has a one-ply tactical reason. `BestMove.bestLine` (the engine's own
principal variation) covers that case, rendered as a step-through-able `PlanBoard` (own `ply`
state) instead of plain SAN text — used from both `Board.tsx` and `GameAnalysisPanel.tsx`, so
react-chessboard's `options.id` must be unique per instance (`useId()`) or it crashes.

`lib/moveQuality.ts` builds a Chess.com-style per-game review from the same saved
`GameAnalysis.evals` — no extra engine work. `classifyMoveQuality()` buckets each move's
`moveSwingCp()` (the swing calc `findBlunders()` already used, now exported from
`lib/analysis.ts` so both can share it) into best/excellent/good/inaccuracy/mistake/blunder; its
"blunder" cutoff is deliberately the same `BLUNDER_THRESHOLD_CP` `findBlunders()` uses, so the
two never disagree about what counts as a blunder. `summarizeMoveQuality()` also scores each
move's accuracy from its win% drop (`evalBarPercent()`'s own logistic curve, the same one the
eval bar renders), using the standard Lichess accuracy formula, averaged per side. `MoveQualityLink`
(`GameAnalysisPanel.tsx`) renders as a link below the move list, opening its own small dialog with
the table — a separate trigger from `AnalyzeButton`'s blunder-by-blunder dialog, not a duplicate of
it — labeled "You"/"Opponent" rather than by username since this app only ever has one user.
Deliberately doesn't attempt Chess.com's Brilliant/Great/Book/Miss tiers (need sacrifice/opening-
book detection this app doesn't have) or its "Game Score" number (not a documented formula).

### Live analysis and free exploration

A game's page also has a chess.com-analysis-tab-style mode, entirely separate from the batch
"Analyze" pass above: `LiveAnalysisPanel.tsx` shows the engine's top 3 candidate lines
(`StockfishEngine.evaluateLines()`, MultiPV) for whatever position is currently on screen,
re-searching on every change rather than running once and persisting. `ExploreToggleButton`
(`Board.tsx`) makes the board itself draggable/clickable, branching freely off the current ply —
reusing `RepertoireBoard`'s click/drag-to-move + `LegalMoveSquare` pattern, minus the
persistence. Both are ephemeral: nothing about a MultiPV search or an explored branch is ever
saved, unlike `GameAnalysis`/`repertoire_moves`.

Explore state (`exploring`/`explorePath`/`explorePly`/`explorePositions`/`displayFen`) lives in
`BoardContext` alongside the recorded game's `ply`, deliberately kept as a _separate_ branch
rather than extending the `ply` concept — an explored line doesn't belong to the game and can be
discarded by exiting. `explorePath`/`explorePly` are backed by refs (`explorePathRef`/
`explorePlyRef`), not read straight from the state closure, in `attemptExploreMove()` and
`playExploreLine()` — same `nodesRef`/`pathRef` pattern `RepertoireBoard` uses and for the same
reason: two explore moves fired faster than a render would otherwise both compute "the current
position" from the same pre-update value. `BoardNavControls`' ◀/▶/⏮/⏭ repoint at the explore path
while exploring (same buttons, not a second nav row); the recorded-game-only Play/auto-advance is
disabled in that state since there's no engine-flagged blunder to stop on for a free line. The
_recorded_ ply's saved-analysis reveal arrow and "better was" blunder-coaching text (own-color-
only, unchanged) are suppressed while exploring — they're tied to a specific recorded ply,
meaningless for an arbitrary explored position — but the live engine's own read of the board
(eval bar, best-move arrow, below) is not: it's sourced from whatever `displayFen` actually is,
so it works in both modes. `BoardView`'s `isAdjacentStep` (only animate a single-step move, not a
multi-ply jump — see its own comment) tracks `explorePly` while exploring and `ply` otherwise via
one `navPly` value, rather than only ever tracking `ply`; switching in or out of exploring counts
as non-adjacent too, since the two numbering spaces aren't comparable.

The engine itself is owned by `LiveAnalysisProvider` (`Board.tsx`, not `LiveAnalysisPanel.tsx` —
see its own comment for why: it needs `useBoardContext()`, and `BoardView` needs its `lines`, so
either direction of a cross-file import between the two files would be circular). Its context
value carries `fen` and `thinking` alongside `lines` — `fen` is which position the _lines_
actually came from, not whatever `displayFen` happens to be by the time a consumer renders, since
a search in flight lags navigation by up to its movetime; `thinking` is true whenever a search is
running or queued (cleared only once its result is the latest one requested), and drives
`LiveAnalysisPanel`'s corner spinner. `BoardView`'s best-move arrow checks `fen === displayFen`
before drawing anything from `lines` (a stale arrow pointing at the wrong squares would be worse
than no arrow), while its eval bar deliberately does **not** — it shows the latest completed
search's number even if a newer one (for wherever the board has since moved to) hasn't finished
yet, so the bar doesn't blink out and back in on every single move/step. Between the two eval
sources, the _saved_ batch analysis wins when one exists and the board isn't exploring (instant
on load, no waiting on a fresh search); the live line is the fallback for an unanalyzed game, and
the only source at all while exploring. The best-move arrow has no such preference: the live
line's arrow always wins over the saved one when both are in play, and — unlike the saved-
analysis arrow — is drawn for either color's move, not just the user's own; chess.com shows what
it thinks is best regardless of whose turn it is, and now so does this. `LiveAnalysisPanel`'s own
line list doesn't need the `fen === displayFen` check the arrow does, since it always renders
`lines` relative to that same `fen`, so the two never disagree with each other even when both lag
the board.

Each engine line, and the explore branch's own "your line" strip (below), render chess.com-style
through a shared `MoveSequence` component rather than a bare space-joined SAN string —
`formatMoveSequence()` (`lib/san.ts`) attaches a move number and color to each move in a sequence
starting from an arbitrary FEN (unlike a game's own `movesSan`, always move 1 White — a line can
start from either color to move), and `MoveSequence` renders each one through `PieceMoveLabel`
(the same piece-icon-on-a-colored-square component the game's own move list already uses), with
the move number shown only before White's move (or once, as "N…", if the sequence opens with
Black) — matching `MoveList`'s "N." vs "N…" convention above. `MoveSequence` lives in its own
file rather than either `Board.tsx` or `LiveAnalysisPanel.tsx`: an engine line's moves are plain
text, but the explore branch's own line needs a highlighted `currentIndex` and a clickable
`onSelectIndex` (jump straight to that point in the branch), and putting either variant in one of
the two files already importing from each other in one direction would make it circular.

`StockfishEngine.evaluateLines()` sets the engine's MultiPV option before every search rather
than tracking whether it's already at the right value (cheap to resend; never interleaved with
plain `evaluate()` calls since each caller owns its own engine instance). Its message-parsing is
split into a pure, Worker-free `parseMultiPvOutput()` — same "pure logic split out for unit
testing" pattern `parseBestMove`/`parseBestLine` already use, since `evaluateLines()` itself
needs a real browser Worker and isn't unit-tested (same exemption `evaluate()`/`analyzeGame()`
already have). `LiveAnalysisProvider` owns one long-lived engine (its own Worker) for as long as
it's mounted — unlike the batch pool that tears down after one run — and coalesces searches to
never more than one in flight: the engine and its request queue are created together in a single
effect (not two effects independently touching a shared ref), so a dev-only React Strict Mode
remount can't leave a drain loop `await`-ing a promise from an already-terminated Worker, which
would otherwise never resolve and hang the panel on "Thinking…" forever.

Each engine line also has a ▶ button, wired to `playExploreLine()` (`BoardContext`) — plays that
whole line onto the explore branch at once (starting exploring first if not already), replaying
each move through chess.js so a line that's gone stale (the position moved on since the search
that produced it) stops at the first move that no longer applies rather than corrupting the
branch, and returns whether anything actually got applied so `LiveAnalysisPanel` only shows its
"queued" checkmark feedback on real success. It deliberately leaves `explorePly` where it was
instead of jumping to the line's end — the point is for the existing ◀/▶ nav to step through it
one move at a time afterward, watching each move land individually, not to make the user manually
drag out a multi-move suggestion themselves (which, before this existed, lost its own reference
partway through: each manual move re-searches and replaces the very line being copied). The
resulting branch is shown as its own "your line" strip pinned inside the panel, above the
candidate lines rather than below the board — tied to `explorePath` itself, not to a search
result, so stepping through it survives the lines below it refreshing around it on every
navigation. A ✕ button there calls `resetExploreLine()`, which empties the branch and jumps back
to ply 0 without leaving exploring mode — distinct from the ◀/⏮ nav, which only moves the
_pointer_ back and leaves the line itself in place to walk into again, and from exiting
exploration entirely, which would also drop back to the recorded game.

## Drilling

A drillable position is fully derivable from existing data (`games.moves_san`,
`repertoire_moves`, `game_analysis.evals`) — `drill_cards` stores only the spaced-repetition
schedule, keyed by `(gameId, sourceType, ply)`, everything else recomputed on demand by
`buildDrillPrompt()` (`lib/drill.ts`). Two card sources: `findDeviationCandidates()` and
`findBlunderCandidates()` (blunders on the user's own plies only). Scheduling is SM-2 with
binary grading. The deck syncs fresh on every `/drill` load, capped to the 15 most-overdue cards.

`DrillSession.tsx` is the most stateful component in the app (a frozen prompt snapshot so a
background revalidation can't reshuffle the active card, a progressive hint system, keyboard
shortcuts) — see its own comments for the specific React patterns involved.

## Blunders aggregate

`buildBlunderStats()` (`lib/blunders.ts`) is pure aggregation over already-stored data, computed
fresh on every `/blunders` load, scoped to analyzed games and the account's own moves only.
Grouped by opening family and by moved piece. `blunderSeverity()` (`lib/analysis.ts`) labels
each blunder "Mistake" (200–399cp) or "Blunder" (400cp+), shown via `BlunderSeverityBadge`.

## Learn openings

**Content is hand-authored, not imported.** `lib/openingTheory.ts` exports a hardcoded
`OPENING_LESSONS: Lesson[]` array — no DB table, no Server Action. Every `sourceUrl` must be
fetched and read live before being cited. **Summaries are paraphrased, never reproduced from the
source** — Wikibooks' Chess Opening Theory is CC BY-SA, this repo is MIT, so a short original
summary plus a visible "Adapted from ..." link sidesteps the licensing mismatch.

The interactive board reuses `Board.tsx`'s provider/board (`components/LessonPractice.tsx`).
Quiz mode (`components/LessonQuiz.tsx`) is separate active-recall practice, self-contained to
`/learn`. `countGamesReachingLine()` matches a synced game's `movesSan` against the lesson's
exact SAN prefix, **not** Chess.com's ECO code/name — a lesson's line is usually a shallower
tabiya than whatever deeper sub-variation Chess.com tags the whole game with.

## Learn endgames

`lib/endgameTheory.ts` mirrors `openingTheory.ts` — same hand-authored/paraphrased rules, same
rendering components. The one real difference: each lesson needs its own constructed
`initialFen` (not the standard start position), and its move sequence runs all the way to an
actual checkmate (or, for the pawn lesson, to promotion) — verified with a `chess.js` script and
covered by a standing test (`endgameTheory.test.ts`). No `countGamesReachingLine()` equivalent —
an endgame isn't reached via a fixed move prefix from move 1.

## Middlegame position checklist

`buildPositionChecklist(fen)` (`lib/checklist.ts`) scans one static position for hanging
pieces/forks/pins/skewers on both sides — unlike the diff-based `detectX()` functions above,
this answers "what's going on right now," useful at any ply a beginner is stuck on, not just one
Stockfish already flagged. Reuses the same exported per-position helpers (`hangingSquares()`,
`forkers()`, `pinnedPieces()`, `skewers()`). A hanging-piece finding is suppressed when the same
square is already a fork/skewer target (noise reduction; pin overlaps are not suppressed —
that's a materially different fact); findings are capped to `MAX_FINDINGS_PER_SIDE` (3) per side.
`describeChecklistFinding()` uses its own EN/ES templates (subject-led, not "this move caused
it" framing, since a checklist isn't tied to any one move).

`PositionChecklist.tsx` renders as `BoardView`'s `sidebarExtra` (a dedicated prop so it stays
next to the board instead of pushing it down the page) and also draws findings directly on the
board — highlighted squares plus arrows, via `findingMarks()`/`findingKey()` and the rose
`CHECKLIST_*` colors in `lib/theme.ts`. Each finding has its own Hide/Show toggle
(`BoardProvider`'s `hiddenFindingKeys`) so a busy position doesn't turn into clutter. See the
component's own comments for layout-history and a react-chessboard duplicate-arrow-key gotcha
(arrows are keyed by start/end square only, not color — dedupe before handing the list to
`Chessboard`).

The sidebar panel itself scans `displayFen` (see "Live analysis and free exploration" below), so
it follows a free-explored branch, not just the recorded game — the on-board highlight/arrow
drawing in `BoardView` doesn't (it's tied to the recorded ply's own logic and stays off while
exploring, by the same reasoning that suppresses the saved-analysis reveal arrow there), so a
busy explored position gets the sidebar text callout but not the board overlay.

## Internationalization (i18n)

English and Spanish, chosen once per deployment via `NEXT_PUBLIC_LOCALE`
(`lib/i18n/locale.ts`) — no in-app switcher; changing the var needs a rebuild.
`lib/i18n/strings.ts` holds the whole UI string dictionary: an untyped `en` object and an `es`
object typed against `typeof en`, so a missing Spanish key is a `tsc` error. Parameterized text
is a function value (e.g. `drill.moreDue(n)`), not a templating engine. **SAN notation, square
names, and Chess.com's own `ecoName` are never translated.**

The tactical-description generators take an optional trailing `locale: Locale = getLocale()`
parameter rather than threading a required one through every call site. Spanish needed real
sentence templates, not word-for-word swaps — gendered articles (torre/dama are feminine) are
centralized in `pieceWithArticle()` (`lib/san.ts`). `Lesson.name`/`.summary`/
`LessonMove.explanation` are `Record<Locale, string>` rather than parallel arrays.

## Testing

- **Vitest** — run with `pnpm test` (or `pnpm test:watch`)
- Tests live in `__tests__/`, one file per `lib/` module they cover. Pure functions are tested
  directly against fixtures — no DB, network, or browser needed for any of them.
- `evaluate()`/`analyzeGame()`/`analyzeGames()` need a real browser Worker and aren't
  unit-tested; only their pure helpers (`terminalEval()`, `parseBestMove()`) are.

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
pnpm build && pnpm start -p 9877      # production (pm2 manages this)
```

See README.md for full pm2 setup instructions.

## Git workflow

- **Never commit directly to `main`.** Every feature, fix, or standalone change gets its own
  branch and at least one PR — `git checkout -b <branch>`, commit there, `gh pr create`.
- **Conventional commits for both commit messages and PR titles** (`feat: …`, `fix: …`,
  `chore: …`, `style: …`), lowercase subject — enforced on commits by commitlint
  (`.husky/commit-msg`), and applied by convention (not enforced by tooling) to PR titles too.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
