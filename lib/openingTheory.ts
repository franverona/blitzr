import type { Game, LessonGameStats, OpeningLesson } from './types'

// Summaries here are paraphrased in original wording, not reproduced from the
// source — the source is CC BY-SA (share-alike) and this repo is MIT, so
// verbatim text would be a licensing mismatch. Ideas aren't copyrightable,
// only specific expression, so a short original summary plus a visible link
// back for attribution and further reading sidesteps that entirely.
export const OPENING_LESSONS: OpeningLesson[] = [
  {
    slug: 'kings-pawn-opening',
    name: "King's Pawn Opening",
    moves: [
      {
        san: 'e4',
        explanation:
          "White pushes the king's pawn two squares, claiming central space and opening a " +
          'diagonal for the bishop on f1 and a line for the queen.',
      },
      {
        san: 'e5',
        explanation:
          "Black mirrors White's claim on the center, staking out equal space and opening " +
          'lines for their own bishop and queen.',
      },
      {
        san: 'Nf3',
        explanation:
          'White develops a knight toward the center, attacks the e5 pawn, and prepares to ' +
          'castle kingside.',
      },
      {
        san: 'Nc6',
        explanation: 'Black develops a knight to defend e5 and adds another attacker on d4.',
      },
      {
        san: 'Bb5',
        explanation:
          'White pins the knight on c6 to the king, indirectly pressuring e5 again — the ' +
          'starting point of the Ruy Lopez.',
      },
    ],
    summary:
      "1. e4 is chess's most popular opening move — it claims the center immediately and " +
      "opens lines for the queen and king's bishop, setting up fast development. The line " +
      'shown here is one classical way it can continue: 1. e4 e5 2. Nf3 Nc6 3. Bb5, the Ruy ' +
      'Lopez.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4',
    primaryColor: 'white',
  },
]

export function getOpeningLesson(slug: string): OpeningLesson | undefined {
  return OPENING_LESSONS.find((lesson) => lesson.slug === slug)
}

/** Counts the account's own synced games that reached at least as far as
 *  `moves` (an exact SAN prefix match against `Game.movesSan`) — see
 *  `LessonGameStats` (`lib/types.ts`) for why this matches on moves played
 *  rather than Chess.com's ECO code/name. Games with no parsed `movesSan`
 *  (unparseable PGN movetext) can't be checked and are simply skipped. */
export function countGamesReachingLine(games: Game[], moves: string[]): LessonGameStats {
  let wins = 0
  let draws = 0
  let losses = 0

  for (const game of games) {
    if (!game.movesSan) continue
    const reached = moves.every((san, i) => game.movesSan![i] === san)
    if (!reached) continue

    if (game.myResult === 'win') wins++
    else if (game.myResult === 'draw') draws++
    else losses++
  }

  return { games: wins + draws + losses, wins, draws, losses }
}
