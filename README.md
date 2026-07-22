<div align="center">

<img src="./app/icon.svg" alt="Blitzr logo" width="64" height="64" />

<h3>Blitzr</h3>

Train on your own blunders, not generic puzzles — a local chess trainer built from your real Chess.com games.

</div>

## What this is

Blitzr is a **personal side project**, not a product. It's built to run on one machine for
one person, against that person's own Chess.com game history. There is no hosted version, no
accounts, and no multi-user support — if you run it, it's your own local instance against
your own Chess.com username.

It ingests your Chess.com games via their public [Published-Data
API](https://www.chess.com/news/view/published-data-api), figures out which openings you
actually play, flags the moment you deviate from a repertoire you define yourself, runs
Stockfish in your browser to find your blunders, drills you on those exact positions —
deviations and blunders alike — with spaced repetition, and rolls your blunders up across
every analyzed game so you can see what actually keeps going wrong.

**Blitzr is unaffiliated with Chess.com.** It uses Chess.com's public, unauthenticated
Published-Data API under their terms. It does not use Chess.com's name, logos, or marks in
any way that implies endorsement or affiliation.

## Status: Phase 5

- [x] Config for your Chess.com username
- [x] Incremental sync of your games into SQLite
- [x] Browse UI — game list, board replay, openings aggregated by ECO
- [x] Phase 2 — intended repertoire + deviation detection
- [x] Phase 3 — Stockfish (WASM) analysis, blunder detection
- [x] Phase 4 — spaced-repetition drilling
- [x] Phase 5 — cross-game recurring-blunders aggregate

## Stack

- **Next.js** (App Router, Server Actions), **TypeScript**
- **SQLite** by default, pluggable via `DB_TYPE` (only `sqlite` is implemented today)
- **Tailwind CSS v4**
- **chess.js** for PGN parsing/move validation, **react-chessboard** for the board UI
- **Stockfish** (WASM), run client-side in a Web Worker for per-game blunder analysis
- **pnpm**, **Vitest**, ESLint + Prettier, Husky pre-commit hooks

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in CHESSCOM_USERNAME
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), then click **Sync games** to fetch your
Chess.com history. Re-running sync only fetches months that aren't fully synced yet, plus the
current month.

SQLite is created automatically at `./data/blitzr.db` on first run — no config needed beyond
your username. To reset, delete the file and re-sync.

## Running as a background service (pm2)

Blitzr runs on port **9877** in production mode, so it doesn't collide with other local dev
projects on 3000.

**First-time setup:**

```bash
npm install -g pm2
pnpm build
pm2 start "pnpm start -- -p 9877" --name blitzr
pm2 save
pm2 startup   # follow the printed command to register with launchd
```

Open [http://localhost:9877](http://localhost:9877).

**Day-to-day commands:**

```bash
pm2 status           # check if blitzr is running
pm2 logs blitzr      # tail logs
pm2 restart blitzr   # restart after a rebuild
pm2 stop blitzr      # stop
pm2 delete blitzr    # remove from pm2 entirely
```

**Updating the app:**

```bash
git pull
pnpm install
pnpm build
pm2 restart blitzr
```

## Scripts

```bash
pnpm dev             # Start dev server
pnpm build           # Production build
pnpm test            # Run unit tests (Vitest)
pnpm test:watch      # Run tests in watch mode
pnpm lint            # ESLint
pnpm format          # Prettier (write)
pnpm format:check    # Prettier (check)
```

## Chess.com API notes

- Base URL: `https://api.chess.com/pub`, no API key required.
- Every request sends a descriptive `User-Agent` (Chess.com throttles requests without one).
- Archives are fetched **serially**, never in parallel, and 429s are retried with backoff.
- Games are synced incrementally: months already fully synced are skipped on future runs; the
  current month is always re-fetched since it can still gain new games.

## Repertoire

On `/repertoire`, build an opening tree per color by playing moves on an editable board — each
move you play is added as a node, and you can branch to prepare more than one reply to an
opponent's try. Every synced game is then diffed against your tree: the game page flags the
first move where you left your own prepared line (an opponent playing something you haven't
prepped for isn't a deviation — only _your own_ moves count).

## Engine analysis (Stockfish)

On a game's page, **Analyze with Stockfish** runs the engine — entirely in your browser, in a
Web Worker — over every position in that game and reports each blunder (a swing of 200+
centipawns) plus the biggest one. See "Reading the evaluation" below for how to interpret the
numbers. Nothing is sent to a server; analysis runs client-side and only the result is saved,
so re-opening the game later shows it without re-running the engine.

To analyze more than one game at a time, **Analyze all** on the Games page runs the engine over
every synced game that doesn't have a saved analysis yet, one after another, showing progress
as it goes. Each game's result is saved as soon as that game finishes, so closing the tab
partway through (or clicking Cancel) doesn't lose what's already done — running it again later
just picks up wherever it left off.

Every game's header also links out to the opening's Chess.com page ("Learn more about this
opening"), and once a game's analyzed, a one-line "Biggest moment" summary and a running
material count (a plain piece-value tally — no engine needed, works even before you've
analyzed) show up alongside the board. Blunder lists spell moves out in plain English too
("Queen captures pawn on f6, check"), not just algebraic notation — and where a blunder simply
hangs a piece (left attacked and undefended, capturable for free), a line explains that too
("This leaves the queen on f6 hanging — it can be captured for free"). That check is
intentionally simple (no evaluation of unequal trades, no awareness of pins) — it won't catch
every kind of mistake, so plenty of blunders show no reason at all, just the eval swing.

### Reading the evaluation

- **Centipawns (cp)**, shown as e.g. `+1.4` or `-0.8`: material/positional advantage in units of
  a pawn, always from **White's** point of view — positive favors White, negative favors Black.
  `+1.4` means "White is up about a pawn and a half's worth of advantage," not literally a pawn
  ahead.
- **Mate scores**, shown as `M3` or `-M2`: a forced checkmate in that many moves, `M` for White
  delivering it, `-M` for Black.
- **Blunder**: any move after which the eval swings 200+ centipawns _against_ the player who
  just moved. A move that was already losing and stays losing isn't flagged again — only the
  swing matters.
- If you're new to reading engine evals, the [chessprogramming.org Evaluation
  page](https://www.chessprogramming.org/Evaluation) covers the same centipawn/mate-score
  convention Stockfish (and Blitzr) uses.

## Drilling

On `/drill`, every repertoire deviation and every blunder from your own moves becomes a card:
you're shown the position right before the mistake and have to find the move that should have
been played (any of your repertoire's prepared replies for a deviation card, the engine's
suggested move for a blunder card). Get it right and the card comes back further out; get it
wrong and it comes back tomorrow, with the correct move revealed as an arrow. The deck stays in
sync automatically — build more repertoire or analyze more games, and new cards just show up
next time you visit.

## Blunders

On `/blunders`, every blunder from your own moves — across every game that's been analyzed so
far — is rolled up into one view: grouped by opening, grouped by moved piece, and a top-10
"worst blunders" list (each entry in plain English, not just algebraic notation, plus a hung-piece
explanation when that's what happened) linking back to each game. It's scoped to whatever's been
analyzed (analyze more games, individually or with **Analyze all**, to fill it in further) rather
than implying full coverage of your history.

## Data hygiene

- Your Chess.com username lives in `.env.local` (config), never in code. The API is
  unauthenticated and public, so there's no secret to leak — `.env.example` documents the one
  variable you need.
- `data/*.db` (your synced games) is gitignored and never committed.
- `public/stockfish/` (the ~7MB WASM engine) is gitignored too — `pnpm install` copies it from
  `node_modules` via a `postinstall` script, so it's never committed either.

## Credits

- Chess piece icons (`components/PieceGlyph.tsx`) are the "light" (white) pieces from
  [Wikimedia Commons' SVG chess piece set](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces),
  originally by [Cburnett](https://commons.wikimedia.org/wiki/User:Cburnett), used under the
  BSD license.
