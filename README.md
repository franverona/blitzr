<div align="center">

<img src="./app/icon.svg" alt="Blitzr logo" width="64" height="64" />

<h3>Blitzr</h3>

Train on your own blunders, not generic puzzles — a local chess trainer built from your real Chess.com games.

</div>

## What this is

Blitzr is a **personal side project**, not a product: it runs on one machine, for one person,
against that person's Chess.com history. No hosted version, no accounts, no multi-user support.

It syncs your games via Chess.com's public [Published-Data
API](https://www.chess.com/news/view/published-data-api), shows which openings you play, flags
where you leave a repertoire you define, runs Stockfish in your browser to find your blunders,
drills you on those positions with spaced repetition, and aggregates what keeps going wrong.

**Blitzr is unaffiliated with Chess.com** and doesn't use its name, logos or marks in any way that
implies endorsement.

## Features

- Incremental sync of your games into SQLite, plus adding any game by pasted PGN
- Game list with opponent search and result/color/rated/accuracy filters
- Board replay, openings aggregated by ECO, and a user-defined repertoire with deviation detection
- In-browser Stockfish analysis: blunders, plain-English tactical explanations, move-quality and
  accuracy, live multi-line analysis and free-move exploration
- Spaced-repetition drilling of your deviations and blunders
- Cross-game blunder stats with an accuracy-over-time chart and date filter
- Opening and endgame lessons with study and quiz modes
- Mate-in-N puzzles you solve move by move, and defence puzzles where you stop a mate
- A Today page: cards due, games left to analyze, last week's accuracy and the next puzzle
- Settings: light/dark theme, board colors, analysis strength, hide engine hints, coordinates,
  move sounds, lesson/puzzle board orientation, auto-play speed, drill session size, and a
  database backup download
- English and Spanish UI

## Stack

- **Next.js** (App Router, Server Actions), **TypeScript**, **Tailwind CSS v4**
- **SQLite** (Kysely + better-sqlite3)
- **chess.js** and **react-chessboard**
- **react-hot-toast** (restyled) for toasts
- **Stockfish** (WASM) in a Web Worker
- **pnpm**, **Vitest**, ESLint + Prettier, Husky

## Getting started

Needs Node 22+ (`.nvmrc`); `pnpm install` refuses older versions.

```bash
pnpm install
cp .env.example .env.local   # set CHESSCOM_USERNAME
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), go to **Games** and click **Sync games**. Later
syncs only fetch months that aren't complete yet, and run on their own when you open Blitzr more
than an hour after the last one (`BLITZR_AUTO_SYNC_MINUTES` in `.env.local` changes that; `0`
turns it off). A sync that adds games offers to analyze them.

The database is created at `./data/blitzr.db` on first run. To reset, delete it and re-sync. To
keep it elsewhere (say, outside the repo, or shared by several checkouts), set `BLITZR_DATA_DIR` in
`.env.local`: the database, its backups and `polgar-mates.json` all move there. The `data/` paths
below assume the default.

Settings → Data → **Download backup** saves a copy of it, and `pnpm backup` writes one to
`data/backups/`. Your repertoire, drill schedules and puzzle progress can't be rebuilt by
re-syncing, so take one before updating. A schema change also copies the database to
`data/backups/pre-migration-<time>.db` before applying itself. To restore, stop
Blitzr, delete `data/blitzr.db-wal` and `data/blitzr.db-shm` if present, and replace
`data/blitzr.db` with the backup.

For a Spanish UI, set `NEXT_PUBLIC_LOCALE=es` in `.env.local` and rebuild.

## Running as a background service (pm2)

Production runs on port **9877** to avoid clashing with other projects on 3000. `pnpm start` (like
`pnpm dev`) binds to `127.0.0.1` only: Server Actions edit your data with no auth, so it must not
be reachable from the local network.

```bash
npm install -g pm2
pnpm build
pm2 start "pnpm start -p 9877" --name blitzr
pm2 save
pm2 startup   # follow the printed command to register with launchd
```

Open [http://localhost:9877](http://localhost:9877). To update:

```bash
pnpm backup && git pull && pnpm install && pnpm build && pm2 restart blitzr
```

Other useful commands: `pm2 status`, `pm2 logs blitzr`, `pm2 stop blitzr`, `pm2 delete blitzr`.

## Scripts

```bash
pnpm dev             # dev server
pnpm build           # production build
pnpm test            # unit tests (Vitest); pnpm test:watch for watch mode
pnpm lint            # ESLint
pnpm format          # Prettier (write); pnpm format:check to check
pnpm backup          # copy the database into data/backups/
```

### Before merging

CI runs these five on every PR, then smoke-tests `pnpm start` against an empty database:

```bash
pnpm format:check
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

`pnpm build` rewrites `.next/`, which a running `pnpm dev` and the pm2 server both read from: the
dev server then silently serves stale code, and the pm2 one can fail to load its pages. Restart
whichever is running after a build.

### Puzzle data scripts

You don't need these to run Blitzr: the Lichess puzzles ship in `lib/`. They rebuild the puzzle
files and are safe to re-run, since a puzzle keeps its id (and so its solved state). All need
Node 22.18+, which runs the TypeScript they import as is.

| Script                             | Writes                                | Needs                                          |
| ---------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `import-lichess-mates.mjs`         | `lib/lichessMates.json`               | the Lichess puzzle CSV on stdin (or as a path) |
| `import-lichess-defenses.mjs`      | `lib/lichessDefenses.json`            | the same CSV, plus a native Stockfish          |
| `check-defenses.mjs [movetime-ms]` | nothing; reports problems             | a native Stockfish                             |
| `import-polgar-mates.mjs`          | `data/polgar-mates.json` (local only) | `polgar.pgn` in the repo root, or `--from-git` |

```bash
brew install stockfish zstd   # macOS; any native stockfish on PATH works
curl -s https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc |
  node scripts/import-lichess-mates.mjs
```

The CSV is the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0, a large
download). See [Puzzles](#puzzles) for what each set contains.

## How it works

### Sync

Requests send a descriptive `User-Agent`, archives are fetched serially (the button shows
month-by-month progress, and games appear as each month lands), and 429s are retried with backoff. Games Chess.com's API never exposes (e.g. "Play Bots" games) can be added with
**Add game by PGN**; they get their own id, so a later sync never touches them. A game that's
already in Blitzr, synced or pasted, can't be added twice. Pick which side
you played, or **Not me** for a game you only want to study: it can still be replayed and
analyzed, but stays out of your openings, blunders, accuracy and drills. Pasted games can be
deleted from their game page.

### Repertoire

On `/repertoire`, build an opening tree per color by playing moves on the board, branching as
needed. Each game page then flags the first move where _you_ left your prepared line — an
opponent's unprepared move doesn't count.

### Engine analysis

**Analyze with Stockfish** on a game page evaluates every position in your browser and saves the
result. **Analyze all** on the games page does this for every unanalyzed game, newest first,
saving as it goes, and keeps running while you browse other pages.

A blunder is a move that drops the mover's winning chances as much as a 200+ centipawn loss from
an equal position would, tagged **Mistake** (200–399 equivalent) or **Blunder** (400+). Measuring
win chances means a move that stays completely winning (+9 → +6.5) isn't flagged. Where a simple pattern explains it — a hanging piece, a fork, a skewer, or
a pin to the king — you get a plain-English explanation, along with the engine's better move and
its follow-up plan on a small step-through board. These checks are intentionally simple, so many
blunders show only the eval swing.

Evals are in pawns from White's point of view (`+1.4` favors White); `M3` / `-M2` are forced
mates. See [chessprogramming.org](https://www.chessprogramming.org/Evaluation) for more.

A game page also has:

- **Play** (or Space), which auto-advances and pauses on your blunders. ←/→ step, Home/↑/`0` jump
  to the start, End/↓ to the end, and `F` flips the board.
- Your **accuracy** in the header; click it for a **Move quality** table with accuracy (Lichess's
  formula, from each move's drop in winning chances) and move tiers for both sides.
- **Engine lines**: the top 3 live lines for the current position. ▶ plays a line onto the board.
- **Explore moves**: try your own moves from any point (just move a piece), with the engine
  following along. Esc or "Back to game" returns to the recorded game.
  Nothing is saved.
- Hanging pieces, forks, pins and skewers in the current position, marked on the board.

### Drilling

`/drill` turns every repertoire deviation and every one of your blunders into a card: find the move
you should have played. Games that left your repertoire at the same position share one card, and missing the same move several turns in a row is one card. On a
blunder card, a move other than the engine's still counts if a quick Stockfish check rates it good
or better. Scheduling is SM-2: right answers come back later, wrong ones tomorrow. Sessions hold 15 cards by default (10 or 25 in settings), the most overdue first.
**Hint** reveals progressively more (an answer found once it shows the piece's square is scheduled
like a wrong one), and cards can be filtered by type (Today's weak spot also
links to a single opening's cards). A checkbox moves on to the next card after a right answer, and reloading the page resumes the
session where you left it.
Shortcuts: Space/Enter for the next card, H for a hint. Re-analyzing a game at another strength can change
which moves count as blunders, so its blunder cards (and their review history) may be replaced.

### Blunders

`/blunders` aggregates your blunders across analyzed games by opening family and by piece, with a top-10
worst list and an accuracy trend (per-game dots plus a 10-game rolling average). A date range
filter scopes the whole page.

### Learn

`/learn` has short lessons on 14 openings and 3 basic endgames, each a line you step through
with a note per move. **Quiz** mode tests you on one side while the opponent's moves play
automatically. Opening lessons show how many of your own games reached that line. Content is
adapted, in original wording, from Wikibooks'
[Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4) and
[Chess/The Endgame](https://en.wikibooks.org/wiki/Chess/The_Endgame) (CC BY-SA).

### Today

The landing page, **Today** (`/`), gathers what's waiting: today's drill session (with the full
due count split by type, and your streak), games not analyzed yet, the last 7 days' accuracy against
your average with results and rating change per time control, the opening you blundered most this
week (with a link to drill it), your worst blunder of the week, how you lost your games, a lesson
for the opening you played most, how often you left your repertoire lately, your last game with its
final position, and the next unsolved puzzle.

### Puzzles

`/puzzles` has mate-in-1/2/3 positions from real games and 2,000 from the
[Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0), sorted from easy to hard,
each linked back to Lichess. You play the whole line yourself, both sides. Wrong moves can be
retried, and **Reveal solution** doesn't count as solving. Solved puzzles are tracked, and the
list filters by status, side to move, type and mate length.

Defence puzzles flip it around: about 500 more Lichess positions, taken one move before a mate in 1
or 2, where your opponent threatens mate and only one or two moves stop it, and at least one of
them escapes mate altogether rather than just delaying it. Any of those moves
solves the puzzle; afterwards you see every saving move and how the game actually went.
`scripts/import-lichess-defenses.mjs` picks them and `scripts/check-defenses.mjs` re-checks them;
both need a native Stockfish (`brew install stockfish`).

László Polgár's _5334 Problems, Combinations, and Games_ is copyrighted, so its mates stay out of
the published puzzle set and live in the gitignored `data/polgar-mates.json` instead, joining the
list after a restart. To create that file (Node 22.18+):

- `node scripts/import-polgar-mates.mjs --from-git` restores it from git history, where the
  puzzles were committed before moving out of the repo. Any clone can do this.
- `node scripts/import-polgar-mates.mjs` imports it from your own copy of the book's PGN at
  `polgar.pgn`.

Either way the puzzles keep their ids, so solved progress in a restored database still matches.
Copying `data/polgar-mates.json` to another machine works too.

## Data hygiene

- Your username lives in `.env.local`, never in code. The API is public, so there's no secret.
- Blitzr answers only requests addressed to `localhost`, `127.0.0.1` or `[::1]` (`proxy.ts`), so a
  web page can't reach it through DNS rebinding. Open it by one of those names.
- `data/*.db`, `data/backups/` and `public/stockfish/` (~7MB, copied from `node_modules` on install) are
  gitignored.

## Contributing

Issues and small fixes are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) for scope and how to
send a change.

## Credits

- Puzzles from the [Lichess puzzle database](https://database.lichess.org/#puzzles), released
  under CC0.

- Chess piece icons (`components/PieceGlyph.tsx`) are from
  [Wikimedia Commons' SVG chess piece set](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)
  by [Cburnett](https://commons.wikimedia.org/wiki/User:Cburnett), used under the BSD license.
