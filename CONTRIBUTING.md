# Contributing

Blitzr is a personal project: a local trainer for one person's own Chess.com games. It's public so
others can read it, fork it and run it for themselves, not to grow into a product.

## Issues

Bug reports are welcome. Please include:

- what you did, what you expected and what happened instead
- your Node version and OS, and the browser if it's a UI problem
- for a game that syncs, imports or analyzes wrongly, its PGN (or Chess.com link)

Feature requests are fine too, but anything that needs accounts, hosting or several users is out
of scope (see [What this is](README.md#what-this-is)).

## Pull requests

Open an issue first for anything bigger than a small fix, so we can agree on the approach.

- Branch from `main`, one change per PR.
- Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/)
  in lowercase (`fix: …`, `feat: …`, `docs: …`); commitlint and CI check both.
- Before pushing, run the checks CI runs (see [Before merging](README.md#before-merging)).
- Add or update tests in `__tests__/` for logic in `lib/`, and keep the English and Spanish strings
  (`lib/i18n/strings.ts`) in sync.

[CLAUDE.md](CLAUDE.md) documents the codebase's conventions in detail: it's written for AI coding
agents, but it's the most complete guide to how things fit together.
