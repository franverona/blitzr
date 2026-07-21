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
actually play, and (in later phases) will detect where you deviate from an intended
repertoire and drill you on those exact positions with spaced repetition.

**Blitzr is unaffiliated with Chess.com.** It uses Chess.com's public, unauthenticated
Published-Data API under their terms. It does not use Chess.com's name, logos, or marks in
any way that implies endorsement or affiliation.

## Status: Phase 1

- [x] Config for your Chess.com username
- [x] Incremental sync of your games into SQLite
- [x] Browse UI — game list, board replay, openings aggregated by ECO
- [ ] Phase 2 — intended repertoire + deviation detection
- [ ] Phase 3 — Stockfish (WASM) analysis, blunder detection
- [ ] Phase 4 — spaced-repetition drilling

## Stack

- **Next.js** (App Router, Server Actions), **TypeScript**
- **SQLite** by default, pluggable via `DB_TYPE` (only `sqlite` is implemented today)
- **Tailwind CSS v4**
- **chess.js** for PGN parsing/move validation, **react-chessboard** for the board UI
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

## Data hygiene

- Your Chess.com username lives in `.env.local` (config), never in code. The API is
  unauthenticated and public, so there's no secret to leak — `.env.example` documents the one
  variable you need.
- `data/*.db` (your synced games) is gitignored and never committed.

## Credits

- Chess piece icons (`components/PieceGlyph.tsx`) are the "light" (white) pieces from
  [Wikimedia Commons' SVG chess piece set](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces),
  originally by [Cburnett](https://commons.wikimedia.org/wiki/User:Cburnett), used under the
  BSD license.
