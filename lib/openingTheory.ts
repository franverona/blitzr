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
  {
    slug: 'sicilian-defense',
    name: 'Sicilian Defense',
    moves: [
      {
        san: 'e4',
        explanation:
          "White pushes the king's pawn two squares, claiming central space and opening a " +
          'diagonal for the bishop on f1 and a line for the queen.',
      },
      {
        san: 'c5',
        explanation:
          'Rather than meeting e4 head-on, Black strikes from the side with a flank pawn — ' +
          "the idea is to trade this c-pawn for White's d-pawn later, gaining a half-open " +
          'c-file and lively piece play in return for giving White a bit more central space.',
      },
      {
        san: 'Nf3',
        explanation: 'White develops a knight and prepares to build a full center with d4.',
      },
      {
        san: 'd6',
        explanation:
          'Black shores up the e5 square in advance and clears the way to develop the ' +
          "kingside knight and bishop, without yet committing the queen's knight or bishop.",
      },
      {
        san: 'd4',
        explanation:
          'White strikes in the center, offering a pawn trade that opens the position and ' +
          'activates pieces on both sides.',
      },
      {
        san: 'cxd4',
        explanation:
          "Black takes — exactly the trade the Sicilian was aiming for: Black's flank c-pawn " +
          "for White's central d-pawn, opening the c-file for Black's rook in the process.",
      },
    ],
    summary:
      "1...c5, the Sicilian Defense, is Black's single most popular reply to 1. e4 — instead " +
      "of mirroring White's central pawn, Black attacks it from the side, aiming to trade " +
      "the c-pawn for White's d-pawn and pick up lively counterplay on the open c-file. The " +
      'line shown reaches the Open Sicilian, one of the most deeply analyzed structures in ' +
      'chess: 1. e4 c5 2. Nf3 d6 3. d4 cxd4.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...c5',
    primaryColor: 'black',
  },
  {
    slug: 'french-defense',
    name: 'French Defense',
    moves: [
      {
        san: 'e4',
        explanation:
          "White pushes the king's pawn two squares, claiming central space and opening a " +
          'diagonal for the bishop on f1 and a line for the queen.',
      },
      {
        san: 'e6',
        explanation:
          'Black prepares to challenge the center with ...d5 next move, backed up by this ' +
          "pawn — a solid plan that costs some time, and temporarily shuts in Black's own " +
          'light-squared bishop.',
      },
      {
        san: 'd4',
        explanation: 'White builds a full two-pawn center, ready to meet a challenge on d5.',
      },
      {
        san: 'd5',
        explanation:
          "Black follows through on the plan from move one, meeting White's center directly " +
          'and creating the closed, pawn-chain structure the French is known for.',
      },
      {
        san: 'Nc3',
        explanation:
          'White develops a knight, adding defense to e4 and putting a second attacker on d5 ' +
          '— Black now has to decide how to relieve the pressure, commonly with ...Bb4 (pinning ' +
          'the knight) or ...Nf6 (adding a defender).',
      },
    ],
    summary:
      '1...e6, the French Defense, is a solid, positional answer to 1. e4 — Black holds off ' +
      'on meeting the center immediately, preparing ...d5 instead. The resulting structures ' +
      "are famously closed and strategic: Black trades some piece activity (the French's " +
      'well-known drawback is a light-squared bishop boxed in behind the e6 pawn) for a ' +
      'resilient pawn chain. The line shown reaches a common tabiya: 1. e4 e6 2. d4 d5 3. Nc3.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...e6',
    primaryColor: 'black',
  },
  {
    slug: 'queens-gambit',
    name: "Queen's Gambit",
    moves: [
      {
        san: 'd4',
        explanation:
          "White claims central space with the queen's pawn instead of the king's — a touch " +
          'more solid than 1. e4, opening a line for the light-squared bishop and the queen.',
      },
      {
        san: 'd5',
        explanation: "Black mirrors White's claim on the center right away.",
      },
      {
        san: 'c4',
        explanation:
          "White offers a pawn — the 'gambit' — to lure Black's d-pawn away from the center " +
          'or, if Black declines, to gain extra influence there instead. The pawn rarely ' +
          'stays won for long even when Black does take it.',
      },
      {
        san: 'e6',
        explanation:
          'Black declines the gambit, reinforcing d5 instead of grabbing the c4 pawn — solid, ' +
          'at the cost of temporarily boxing in the light-squared bishop, same trade-off the ' +
          'French Defense makes.',
      },
      {
        san: 'Nc3',
        explanation: 'White develops a knight, adding a second attacker on d5.',
      },
      {
        san: 'Nf6',
        explanation:
          'Black develops symmetrically, adding a defender of d5 and preparing to castle ' +
          'kingside.',
      },
    ],
    summary:
      "1. d4, followed by 2. c4, is the Queen's Gambit — one of the oldest and most " +
      "respected ways to open a game. White offers the c-pawn to pull Black's central " +
      "d-pawn away or gain extra central influence instead; Black doesn't have to accept it, " +
      'and rarely holds onto it for long even when they do. The line shown reaches the ' +
      "Queen's Gambit Declined, one of the most classical structures in chess: 1. d4 d5 " +
      '2. c4 e6 3. Nc3 Nf6.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._d4/1...d5/2._c4',
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
