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
- Mate-in-N puzzles you solve move by move
- Settings: light/dark theme, board colors, analysis strength, hide engine hints, coordinates,
  move sounds
- English and Spanish UI

## Stack

- **Next.js** (App Router, Server Actions), **TypeScript**, **Tailwind CSS v4**
- **SQLite** by default, pluggable via `DB_TYPE` (only `sqlite` is implemented)
- **chess.js** and **react-chessboard**
- **Stockfish** (WASM) in a Web Worker
- **pnpm**, **Vitest**, ESLint + Prettier, Husky

## Getting started

```bash
pnpm install
cp .env.example .env.local   # set CHESSCOM_USERNAME
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Sync games**. Later syncs only
fetch months that aren't complete yet.

The database is created at `./data/blitzr.db` on first run. To reset, delete it and re-sync.

For a Spanish UI, set `NEXT_PUBLIC_LOCALE=es` in `.env.local` and rebuild.

## Running as a background service (pm2)

Production runs on port **9877** to avoid clashing with other projects on 3000. `pnpm start` binds
to `127.0.0.1` only: Server Actions edit your data with no auth, so it must not be reachable from
the local network.

```bash
npm install -g pm2
pnpm build
pm2 start "pnpm start -p 9877" --name blitzr
pm2 save
pm2 startup   # follow the printed command to register with launchd
```

Open [http://localhost:9877](http://localhost:9877). To update:

```bash
git pull && pnpm install && pnpm build && pm2 restart blitzr
```

Other useful commands: `pm2 status`, `pm2 logs blitzr`, `pm2 stop blitzr`, `pm2 delete blitzr`.

## Scripts

```bash
pnpm dev             # dev server
pnpm build           # production build
pnpm test            # unit tests (Vitest); pnpm test:watch for watch mode
pnpm lint            # ESLint
pnpm format          # Prettier (write); pnpm format:check to check
```

## How it works

### Sync

Requests send a descriptive `User-Agent`, archives are fetched serially (the button shows
month-by-month progress, and games appear as each month lands), and 429s are retried with backoff. Games Chess.com's API never exposes (e.g. "Play Bots" games) can be added with
**Add game by PGN**; they get their own id, so a later sync never touches them. Pick which side
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
- A **Move quality** table with Chess.com-style accuracy and move tiers for both sides.
- **Engine lines**: the top 3 live lines for the current position. ▶ plays a line onto the board.
- **Explore moves**: try your own moves from any point, with the engine following along.
  Nothing is saved.
- A **Position checklist** of hanging pieces, forks, pins and skewers in the current position,
  also drawn on the board.

### Drilling

`/drill` turns every repertoire deviation and every one of your blunders into a card: find the
move you should have played. On a blunder card, a move other than the engine's still counts if a
quick Stockfish check rates it good or better. Scheduling is SM-2: right answers come back later,
wrong ones tomorrow. Sessions hold 15 cards, the most overdue first. **Hint** reveals progressively
more, and cards can be filtered by type and opening. Shortcuts: Space/Enter for the next card, H for a hint.
Re-analyzing a game at another strength can change which moves count as blunders, so its blunder
cards (and their review history) may be replaced.

### Blunders

`/blunders` aggregates your blunders across analyzed games by opening and by piece, with a top-10
worst list and an accuracy trend (per-game dots plus a 10-game rolling average). A date range
filter scopes the whole page.

### Learn

`/learn` has short lessons on 14 openings and 3 basic endgames, each a line you step through
with a note per move. **Quiz** mode tests you on one side while the opponent's moves play
automatically. Opening lessons show how many of your own games reached that line. Content is
adapted, in original wording, from Wikibooks'
[Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4) and
[Chess/The Endgame](https://en.wikibooks.org/wiki/Chess/The_Endgame) (CC BY-SA).

### Puzzles

`/puzzles` has mate-in-1/2/3 positions from real games and László Polgár's _5334 Problems,
Combinations, and Games_. You play the whole line yourself, both sides. Wrong moves can be
retried, and **Reveal solution** doesn't count as solving. Solved puzzles are tracked, and the
list filters by status, side to move and mate length.

## Data hygiene

- Your username lives in `.env.local`, never in code. The API is public, so there's no secret.
- `data/*.db` and `public/stockfish/` (~7MB, copied from `node_modules` on install) are
  gitignored.

## Credits

- Chess piece icons (`components/PieceGlyph.tsx`) are from
  [Wikimedia Commons' SVG chess piece set](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)
  by [Cburnett](https://commons.wikimedia.org/wiki/User:Cburnett), used under the BSD license.
