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
- **Phase 6 (done)**: `/learn` — hand-authored, plain-English opening lessons with an interactive
  board, a Study mode (read the line) and a Quiz mode (play it from memory, one side at a time).
  14 lessons so far (King's Pawn Opening, Sicilian Defense, French Defense, Queen's Gambit,
  Italian Game, Caro-Kann Defense, Scandinavian Defense, King's Indian Defense, English Opening,
  Nimzo-Indian Defense, Grünfeld Defense, King's Gambit, Scotch Game, Pirc Defense); adding more
  is a content-only addition from here (see "Learn openings" below).

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
  DrillSession.tsx                     # one drill card at a time
  DrillFilters.tsx                       # sourceType tabs + opening select
  LessonPractice.tsx                     # Study/Quiz toggle for a /learn lesson
  LessonQuiz.tsx                           # active-recall quiz on a lesson's line
  MoveExplanation.tsx                       # per-move note for the lesson currently on the board
  AboutOpeningButton.tsx                      # lesson summary + source link dialog
  FlipBoardButton.tsx                           # flips board orientation on a lesson
  MiniBoard.tsx                                   # small board preview for /learn index cards
  BlunderStats.tsx                       # by-opening/by-piece/worst-blunders aggregate view
  EvalHelp.tsx                             # shared eval/blunder/swing notation glossary
  BlunderSeverityBadge.tsx                   # Mistake/Blunder severity pill
  LegalMoveSquare.tsx                    # legal-move dot/ring/selected square highlighting
  OpeningsTable.tsx                    # family/line aggregation table
  PieceGlyph.tsx / PieceMoveLabel.tsx    # chess piece SVGs
  KnightGlyph.tsx / KnightIcon.tsx         # favicon/side-badge knight icon
  PlayerAvatar.tsx                           # Chess.com profile avatar, initial-letter fallback
  NavLinks.tsx                                 # active-tab nav
  SyncButton.tsx                                  # triggers the sync Server Action
  BulkAnalyzeButton.tsx                              # "Analyze all" across unanalyzed games
lib/
  config.ts                # getChesscomUsername()
  theme.ts                  # shared board/arrow color constants
  types.ts                  # domain types
  dates.ts                   # formatDate/formatDateTime — hand-formatted, not Intl
  san.ts                       # SAN/move-number display helpers, describeMove()
  material.ts                    # materialDiff()/formatMaterialDiff()
  hangingPiece.ts                # detectHangingPiece()/describeHangingPieceReason()
  tactics.ts                     # detectFork()/detectPin()/describe*(), detectBlunderReason()
  legalMoves.ts                 # legalDestinations(fen, square)
  positions.ts                  # buildPositions() — movesSan into a FEN-per-ply array
  openings.ts                    # buildOpeningFamilies() — pure aggregation
  openingTheory.ts                 # OPENING_LESSONS/getOpeningLesson()/countGamesReachingLine()
  repertoire.ts                    # buildRepertoireIndex(), diffGameAgainstRepertoire()
  analysis.ts                       # findBlunders(), biggestBlunder(), formatEval()
  drill.ts                           # candidate-finding, card hydration, SM-2 scheduling
  blunders.ts                          # buildBlunderStats() — pure aggregation
  sync.ts                            # syncAllArchives()
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
- **Board colors and the reveal-arrow amber have one source of truth**: `lib/theme.ts` for
  react-chessboard's color props (a Tailwind class can't reach them), and the `accent` Tailwind
  theme color (`app/globals.css`) for everywhere a className can. Not extended to Tailwind's own
  gray/rose/emerald/amber palette, which is already single-sourced by Tailwind itself.
- **Beginner-facing jargon is explained in place**, not simplified away — `<abbr title="...">`
  tooltips (ECO codes, in book/deviated, time class, severity badges) and `EvalHelp`'s glossary.
- **A component that seeds state with `useState(initialX)` needs `key={id}`** wherever the same
  component instance can receive new props for a different record (`GameAnalysisProvider`/
  `BoardProvider` keyed on `game.id`, `LessonPractice`/`DrillSession` keyed on `lesson.slug`/
  filter values) — otherwise switching records shows stale state instead of the new props.

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

A branching tree per color (`repertoire_moves` — `parent_id`/`ply`/`move_san`/`fen`; multiple
children at one node is how you prepare replies to more than one opponent try). Built
interactively on `/repertoire` (`RepertoireBoard.tsx`) by playing moves on an editable board,
client-generated ids via `crypto.randomUUID()`. `diffGameAgainstRepertoire()` (`lib/repertoire.ts`)
flags a **deviation** only when the mismatch is on the user's own ply and the tree had a prepared
child there — an opponent's unprepared try, or the tree simply running out, doesn't count. The
same real-time hanging-piece/fork warning used in analysis (`detectBlunderReason()`,
`lib/tactics.ts`) runs live while building the tree, derived from the current node's FEN rather
than stored state.

## Engine analysis (Phase 3)

Stockfish runs **client-side only**, in a browser Web Worker — Server Actions
(`getGameAnalysis`/`saveGameAnalysis`) only persist results, never run the engine.
`scripts/setup-stockfish.mjs` copies the WASM build into `public/stockfish/` on install (gitignored,
same as `data/*.db` — a Worker needs a real URL, not something bundled). `StockfishEngine`
(`lib/stockfish/client.ts`) is a thin UCI wrapper normalizing every eval to White's perspective;
`lib/stockfish/analyze.ts` orchestrates the per-position loop (single game and bulk "Analyze all"
share the same `analyzePositions()` helper and, for bulk, a single engine instance across every
game rather than one per game). `findBlunders()` (`lib/analysis.ts`) flags any swing ≥200
centipawns; `game_analysis.evals` stores one JSON row per game, overwritten on re-analysis.

Beyond the raw eval, the game/blunders/drill pages layer on plain-English explanations:
`describeMove()` (`lib/san.ts`) turns a SAN move into a sentence; `detectHangingPiece()`/
`detectFork()`/`detectPin()` (`lib/hangingPiece.ts`/`lib/tactics.ts`) say _why_ a move was a
blunder (hung piece, fork, or an absolute pin to the king — all deliberately narrow v1 heuristics:
no static-exchange evaluation, no relative pins, one-ply lookback only); `detectBlunderReason()`
is the combinator every call site actually uses, checked in that order (hanging piece first, since
it's the most immediately concrete; pin last, since it's a constraint rather than material lost).
`explainBestMove()`/`describeBetterMove()` (`lib/tactics.ts`) apply the same three detectors to
the engine's suggested move instead of the one played, explaining why the alternative was better.
See each file's own comments for the specific algorithms and edge cases — `lib/tactics.ts` in
particular has several non-obvious tricks (forcing a FEN's turn field to query a color that isn't
actually on move, swapping FEN order to detect "resolved" vs "newly created", ray-casting outward
from the king to find pins without needing chess.js to expose "who's attacking this square")
worth reading before touching it.

Not every better move has a one-ply tactical reason — a quiet positional move's payoff can be
several plies out, where `detectHangingPiece()`/`detectFork()`/`detectPin()` have nothing to say. `BestMove`
carries `bestLine` (the engine's own principal variation, replayed into SAN via
`parseBestLine()` in `lib/stockfish/client.ts`) for exactly that case, rendered as a trailing
"Plan: ..." clause in `describeBetterMove()`'s output. `evals` is stored as opaque JSON, so this
needed no migration — analyses saved before this field existed just have no plan until
re-analyzed. `components/PlanBoard.tsx` renders that plan as a real, step-through-able board
(own `ply` state, `Start/Previous/Next/End` controls) rather than SAN text alone — used from both
`Board.tsx`'s inline suggestion and `GameAnalysisPanel.tsx`'s blunder list, so a page can have
several simultaneous `Chessboard` instances at once. react-chessboard requires a unique `options.id`
per instance for this (`useId()` in both `Board.tsx` and `PlanBoard.tsx`) — omitting it isn't
just a style nit, it crashes with "Square width not found" once two boards share a page.

## Drilling (Phase 4)

A drillable position is fully derivable from data that already exists (`games.moves_san`,
`repertoire_moves`, `game_analysis.evals`) via the same pure functions Phases 2/3 built —
`drill_cards` stores only the spaced-repetition schedule, keyed by `(gameId, sourceType, ply)`,
everything else recomputed on demand by `buildDrillPrompt()` (`lib/drill.ts`). Two card sources:
`findDeviationCandidates()` (repertoire deviations) and `findBlunderCandidates()` (blunders on the
user's own plies only). Scheduling (`scheduleReview()`) is SM-2 with binary grading. The deck
syncs fresh on every `/drill` load (`getDrillDeck()`, `app/actions.ts`) rather than a separate
sync step, and is capped at the 15 most-overdue cards per session (`selectSessionCards()`).

`DrillSession.tsx` is the most stateful component in the app — snapshotting its `prompts` prop on
mount (so a background revalidation mid-session can't reshuffle the active card out from under
it), a progressive 3-level hint system, shuffle-and-restart, and keyboard shortcuts. See the
file's own comments for the specific React traps involved (the frozen-snapshot pattern, the
`answeredRef` double-submit guard, `committedFen` for showing a correct move landing on the
board). `?type=`/`?opening=` filters follow the same URL-driven pattern as `/repertoire`'s
`?color=`, with `DrillSession` keyed on the filter values so switching filters remounts a fresh
session instead of reusing the frozen one.

## Blunders aggregate (Phase 5)

Pure aggregation over already-stored data, no new table — `buildBlunderStats()` (`lib/blunders.ts`)
mirrors `buildOpeningFamilies()`'s shape, computed fresh on every `/blunders` load. Scoped to
analyzed games only (the page's summary line makes that explicit) and the account's own moves only
(`whiteToMove()`, shared with the drill deck's blunder filter). Grouped by opening family and by
moved piece; the worst-blunders list's plain-English fields (`moveDescription`/`reason`/
`betterMove`) are only computed for the ≤10 entries that survive the sort-and-slice, not every
blunder counted along the way. `EvalHelp` (`components/EvalHelp.tsx`) is a shared "how to read
this" glossary used by both this page and the game analysis dialog. `blunderSeverity()`
(`lib/analysis.ts`) labels each blunder "Mistake" (200–399cp) or "Blunder" (400cp+) without
changing what counts as a blunder anywhere — shown via `BlunderSeverityBadge`.

## Learn openings (Phase 6)

**Content is hand-authored, not imported.** `lib/openingTheory.ts` exports a hardcoded
`OPENING_LESSONS: OpeningLesson[]` array plus `getOpeningLesson(slug)` — no DB table, no Server
Action, same "just data in code" treatment as `PIECE_NAMES`/`TIME_CLASS_TOOLTIPS`. A new lesson is
a content-only array entry; 14 exist today across every major first move and both colors. Every
`sourceUrl` must be fetched and read live before being cited (don't guess Wikibooks' page-naming
pattern — some subpages are nested 5-6 moves deep). **Summaries are paraphrased in original
wording, never reproduced from the source** — Wikibooks' Chess Opening Theory is CC BY-SA
(share-alike), this repo is MIT, so verbatim text would be a licensing mismatch; a short original
summary plus a visible "Adapted from ..." link (`OpeningLesson.sourceUrl`) sidesteps that. Follow
this pattern for every future lesson.

The interactive board reuses `Board.tsx`'s `BoardProvider`/`BoardNavControls`/`BoardView`
(`components/LessonPractice.tsx`), same as the game-replay page, just fed `lesson.moves` instead
of a synced game. Quiz mode (`components/LessonQuiz.tsx`) is separate active-recall practice —
play the line from memory, one side at a time (`OpeningLesson.primaryColor` picks the default
side, matching which player the lesson is framed around; flippable) — self-contained to `/learn`,
no `drill_cards`/SM-2 involved. Each lesson also cross-links to the account's own data:
`countGamesReachingLine()` (`lib/openingTheory.ts`) checks whether a synced game's `movesSan`
starts with the lesson's exact SAN sequence, **not** Chess.com's ECO code/name — a lesson's line
is usually just a tabiya, and real games almost always continue into a deeper, more specific named
sub-variation that Chess.com tags the whole game with instead (confirmed live: this account's two
actual Ruy Lopez games are tagged `C70`/"Morphy Defense", not the `C60` the lesson's own position
maps to — an ECO-code match would have shown 0 games despite 2 real ones). See each component's
own comments for further implementation detail.

## Testing

- **Vitest** — run with `pnpm test` (or `pnpm test:watch`)
- Tests live in `__tests__/`, one file per `lib/` module they cover: `normalize.test.ts`,
  `openings.test.ts`, `repertoire.test.ts`, `analysis.test.ts`, `san.test.ts` (including
  `describeMove()`/`hintPieceName()`), `material.test.ts`, `hangingPiece.test.ts`, `tactics.test.ts`,
  `openingTheory.test.ts`, `dates.test.ts`, `drill.test.ts`,
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
