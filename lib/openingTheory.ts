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
  {
    slug: 'italian-game',
    name: 'Italian Game',
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
        san: 'Bc4',
        explanation:
          "White develops the other bishop straight at Black's weakest point, f7 — a more " +
          "direct plan than the Ruy Lopez's pin on c6, at the cost of not pressuring e5 at all.",
      },
      {
        san: 'Bc5',
        explanation:
          "Black mirrors the idea, developing the bishop toward White's own weak f2 square and " +
          'completing the symmetric setup known as the Giuoco Piano — Italian for "quiet game."',
      },
    ],
    summary:
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 is the Italian Game — one of the oldest recorded openings, ' +
      'and a natural alternative to the Ruy Lopez from the same starting position. Instead of ' +
      "pinning the knight on c6, White's bishop aims straight down the diagonal at f7, Black's " +
      'most vulnerable square early in the game. The line shown reaches the Giuoco Piano, ' +
      'Black mirroring the same idea: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5.',
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...e5/2._Nf3/2...Nc6/3._Bc4/3...Bc5',
    primaryColor: 'white',
  },
  {
    slug: 'caro-kann-defense',
    name: 'Caro-Kann Defense',
    moves: [
      {
        san: 'e4',
        explanation:
          "White pushes the king's pawn two squares, claiming central space and opening a " +
          'diagonal for the bishop on f1 and a line for the queen.',
      },
      {
        san: 'c6',
        explanation:
          'Black prepares ...d5 with a pawn, same plan as the French Defense — but c6 stays ' +
          "out of the way of Black's own light-squared bishop, unlike the French's e6.",
      },
      {
        san: 'd4',
        explanation: 'White builds a full two-pawn center, ready to meet a challenge on d5.',
      },
      {
        san: 'd5',
        explanation:
          "Black follows through, meeting White's center directly with the pawn c6 was " +
          'preparing to support.',
      },
      {
        san: 'Nc3',
        explanation:
          'White develops a knight, defending e4 and adding a second attacker on d5 — Black ' +
          'has to decide whether to maintain the tension or resolve it.',
      },
      {
        san: 'dxe4',
        explanation:
          'Black resolves the central tension right away, trading off a central pawn rather ' +
          'than maintaining it — one of the main plans in the Caro-Kann.',
      },
      {
        san: 'Nxe4',
        explanation: 'White recaptures, centralizing the knight on an active square.',
      },
      {
        san: 'Bf5',
        explanation:
          'Black develops the light-squared bishop actively, hitting the knight on e4 and ' +
          'gaining a tempo — exactly the diagonal ...c6 (instead of ...e6) was played to keep ' +
          'open.',
      },
    ],
    summary:
      '1...c6, the Caro-Kann Defense, is a solid answer to 1. e4 that solves the French ' +
      "Defense's biggest problem: Black still prepares ...d5 to meet the center head-on, but " +
      'without shutting in the light-squared bishop first. The line shown reaches a classical ' +
      "tabiya: 1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5, Black's bishop developing actively " +
      'before the rest of the position locks into place.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...c6',
    primaryColor: 'black',
  },
  {
    slug: 'scandinavian-defense',
    name: 'Scandinavian Defense',
    moves: [
      {
        san: 'e4',
        explanation:
          "White pushes the king's pawn two squares, claiming central space and opening a " +
          'diagonal for the bishop on f1 and a line for the queen.',
      },
      {
        san: 'd5',
        explanation:
          'Black challenges the e4 pawn immediately, offering to trade central pawns right ' +
          'away rather than building up first.',
      },
      {
        san: 'exd5',
        explanation: 'White captures, picking up the pawn for the moment.',
      },
      {
        san: 'Qxd5',
        explanation:
          'Black recaptures with the queen — simple and direct, but it brings the queen out ' +
          'early where White can attack it and gain time.',
      },
      {
        san: 'Nc3',
        explanation:
          'White develops a knight while attacking the queen — exactly the cost Black accepted ' +
          'by recapturing with the queen so soon rather than developing a piece first.',
      },
      {
        san: 'Qa5',
        explanation:
          "Black retreats to a safe, still-useful square, keeping an eye on e5 and White's " +
          "king's position while getting out of the way so normal development can continue.",
      },
    ],
    summary:
      "1...d5, the Scandinavian Defense, meets White's center head-on immediately rather than " +
      'easing into it — direct and easy to learn, at the cost of the tempo Black loses when ' +
      'White later attacks the recapturing queen. The line shown reaches one of the most ' +
      'common tabiyas: 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...d5',
    primaryColor: 'black',
  },
  {
    slug: 'kings-indian-defense',
    name: "King's Indian Defense",
    moves: [
      {
        san: 'd4',
        explanation:
          "White claims central space with the queen's pawn instead of the king's — a touch " +
          'more solid than 1. e4, opening a line for the light-squared bishop and the queen.',
      },
      {
        san: 'Nf6',
        explanation:
          'Black develops a knight first rather than immediately staking a claim in the ' +
          'center with a pawn, keeping plans flexible and eyeing a kingside fianchetto.',
      },
      {
        san: 'c4',
        explanation:
          'White expands further, building toward a broad pawn center rather than developing ' +
          'pieces yet.',
      },
      {
        san: 'g6',
        explanation:
          'Black prepares to fianchetto the dark-squared bishop rather than occupy the center ' +
          'directly — a hypermodern idea: let White build a big center now, then attack it ' +
          'later from the side.',
      },
      {
        san: 'Nc3',
        explanation: 'White develops a knight, adding central control and preparing e4.',
      },
      {
        san: 'Bg7',
        explanation:
          'Black completes the fianchetto — the point of the whole setup. The bishop presses ' +
          'the long diagonal and the center from a distance, ready to back up a later ' +
          '...c5 or ...e5 strike at whatever center White builds.',
      },
    ],
    summary:
      "1...Nf6 followed by ...g6 and ...Bg7 is the King's Indian Defense — instead of meeting " +
      '1. d4 with a central pawn right away, Black lets White build a big pawn center and ' +
      'plans to undermine it later, backed up by a fianchettoed bishop and, often, a kingside ' +
      'attack. One of the most heavily analyzed defenses in chess. The line shown reaches the ' +
      "setup's starting point: 1. d4 Nf6 2. c4 g6 3. Nc3 Bg7.",
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._d4/1...Nf6/2._c4/2...g6/3._Nc3/3...Bg7',
    primaryColor: 'black',
  },
  {
    slug: 'english-opening',
    name: 'English Opening',
    moves: [
      {
        san: 'c4',
        explanation:
          'White claims space on the queenside with a flank pawn instead of occupying the ' +
          'center directly, keeping options open about whether to follow up with d4 or e4.',
      },
      {
        san: 'e5',
        explanation:
          'Black claims full central space in return — the same structure as a Sicilian ' +
          "Defense with colors reversed, except it's White who gets the extra tempo.",
      },
      {
        san: 'Nc3',
        explanation:
          'White develops a knight, adding pressure toward the center while staying flexible ' +
          'about where the rest of the pieces go.',
      },
      {
        san: 'Nf6',
        explanation: 'Black develops a knight toward the center, mirroring the same idea.',
      },
      {
        san: 'Nf3',
        explanation: 'White develops the other knight, still without committing the central pawns.',
      },
      {
        san: 'Nc6',
        explanation:
          'Black completes symmetric development, defending e5 and preparing to expand ' +
          'further.',
      },
    ],
    summary:
      '1. c4, the English Opening, is the fourth most popular first move in chess — a flank ' +
      "pawn that keeps White's central plans flexible rather than committing to d4 or e4 " +
      'immediately, while discouraging an early ...d5 from Black. The line shown reaches a ' +
      'reversed Sicilian structure, both sides just developing naturally: 1. c4 e5 2. Nc3 ' +
      'Nf6 3. Nf3 Nc6.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._c4/1...e5',
    primaryColor: 'white',
  },
  {
    slug: 'nimzo-indian-defense',
    name: 'Nimzo-Indian Defense',
    moves: [
      {
        san: 'd4',
        explanation:
          "White claims central space with the queen's pawn instead of the king's — a touch " +
          'more solid than 1. e4, opening a line for the light-squared bishop and the queen.',
      },
      {
        san: 'Nf6',
        explanation:
          'Black develops a knight first rather than immediately staking a claim in the ' +
          'center with a pawn, keeping plans flexible.',
      },
      {
        san: 'c4',
        explanation:
          'White expands further, building toward a broad pawn center rather than ' +
          'developing pieces yet.',
      },
      {
        san: 'e6',
        explanation:
          'Black prepares to develop the dark-squared bishop actively next move, while ' +
          'keeping the option of a solid central setup with ...d5 later.',
      },
      {
        san: 'Nc3',
        explanation: 'White develops a knight, adding central control and preparing e4.',
      },
      {
        san: 'Bb4',
        explanation:
          "Black pins the knight to White's king, preventing e4 and pressuring the center " +
          'indirectly rather than occupying it — the defining idea of the Nimzo-Indian, one ' +
          'of the most respected defenses to 1. d4.',
      },
    ],
    summary:
      '1...Nf6 followed by ...e6 and ...Bb4 is the Nimzo-Indian Defense — instead of meeting ' +
      '1. d4 with a central pawn, Black develops a piece straight to an active pin, stopping ' +
      'White from building an ideal center with e4 and often accepting doubled pawns from ' +
      'White in exchange for the bishop pair or a favorable structure later. The line shown ' +
      'reaches the starting point: 1. d4 Nf6 2. c4 e6 3. Nc3 Bb4.',
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._d4/1...Nf6/2._c4/2...e6/3._Nc3/3...Bb4',
    primaryColor: 'black',
  },
  {
    slug: 'grunfeld-defense',
    name: 'Grünfeld Defense',
    moves: [
      {
        san: 'd4',
        explanation:
          "White claims central space with the queen's pawn instead of the king's — a touch " +
          'more solid than 1. e4, opening a line for the light-squared bishop and the queen.',
      },
      {
        san: 'Nf6',
        explanation:
          'Black develops a knight first rather than immediately staking a claim in the ' +
          'center with a pawn, keeping plans flexible.',
      },
      {
        san: 'c4',
        explanation:
          'White expands further, building toward a broad pawn center rather than ' +
          'developing pieces yet.',
      },
      {
        san: 'g6',
        explanation:
          'Black prepares to fianchetto the dark-squared bishop rather than occupy the ' +
          'center directly — a hypermodern idea: let White build a big center now, then ' +
          'attack it later from the side.',
      },
      {
        san: 'Nc3',
        explanation: 'White develops a knight, adding central control and preparing e4.',
      },
      {
        san: 'd5',
        explanation:
          "Black immediately strikes at White's center with a pawn instead of completing " +
          "the fianchetto first — unlike the King's Indian's ...Bg7, this challenges the " +
          'center right away, most famously seen in Fischer\'s "Game of the Century."',
      },
    ],
    summary:
      '1...Nf6 2...g6 followed by 3...d5 is the Grünfeld Defense — it shares its first moves ' +
      "with the King's Indian Defense, but strikes at White's center immediately with a " +
      'pawn instead of finishing the fianchetto first, usually leading to open, symmetrical-' +
      "pawn-trade positions rather than the closed middlegames the King's Indian is known " +
      'for. The line shown reaches the classic starting position: 1. d4 Nf6 2. c4 g6 3. Nc3 d5.',
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._d4/1...Nf6/2._c4/2...g6/3._Nc3/3...d5',
    primaryColor: 'black',
  },
  {
    slug: 'kings-gambit',
    name: "King's Gambit",
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
        san: 'f4',
        explanation:
          'White offers a second pawn to rip open the center and the f-file for a fast, ' +
          'aggressive attack — one of the oldest and most romantic gambits in chess.',
      },
      {
        san: 'exf4',
        explanation:
          'Black accepts, grabbing the pawn — sharp and double-edged for both sides, and the ' +
          "main reason this line is called the King's Gambit Accepted.",
      },
      {
        san: 'Nf3',
        explanation:
          'White develops with tempo, stopping ...Qh4+ from harassing the king and preparing ' +
          'to win back the pawn or build a big center with d4.',
      },
    ],
    summary:
      "1. e4 e5 2. f4 is the King's Gambit — White offers a second pawn straight out of the " +
      'opening to blow the position open and attack fast, at the risk of falling behind in ' +
      "material if the attack doesn't land. Once among the most popular openings in chess, " +
      "now more of a surprise weapon. The line shown reaches the King's Gambit Accepted: " +
      '1. e4 e5 2. f4 exf4 3. Nf3.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...e5/2._f4',
    primaryColor: 'white',
  },
  {
    slug: 'scotch-game',
    name: 'Scotch Game',
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
        san: 'd4',
        explanation:
          'Rather than developing a bishop first like the Italian Game or Ruy Lopez, White ' +
          'strikes in the center immediately, aiming to open the position before Black ' +
          'finishes developing.',
      },
      {
        san: 'exd4',
        explanation:
          'Black takes the pawn — played almost automatically here — and White will ' +
          'recapture with the knight next, landing it on an active central square.',
      },
    ],
    summary:
      '1. e4 e5 2. Nf3 Nc6 3. d4 is the Scotch Game — a direct alternative to the Italian ' +
      'Game and Ruy Lopez from the same starting position, opening the center immediately ' +
      "instead of developing a bishop first. The line shown reaches Black's near-automatic " +
      'reply: 1. e4 e5 2. Nf3 Nc6 3. d4 exd4.',
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...e5/2._Nf3/2...Nc6/3._d4',
    primaryColor: 'white',
  },
  {
    slug: 'pirc-defense',
    name: 'Pirc Defense',
    moves: [
      {
        san: 'e4',
        explanation:
          "White pushes the king's pawn two squares, claiming central space and opening a " +
          'diagonal for the bishop on f1 and a line for the queen.',
      },
      {
        san: 'd6',
        explanation:
          "Black doesn't contest the center with a pawn at all yet, planning to develop " +
          'pieces first and strike back later — a hypermodern idea similar in spirit to the ' +
          "King's Indian Defense, just against 1. e4 instead of 1. d4.",
      },
      {
        san: 'd4',
        explanation: "White takes full central space, since Black hasn't contested it directly.",
      },
      {
        san: 'Nf6',
        explanation: 'Black develops, attacking e4 and preparing to fianchetto next.',
      },
      {
        san: 'Nc3',
        explanation: 'White defends e4 and develops a piece.',
      },
      {
        san: 'g6',
        explanation:
          'Black fianchettoes the dark-squared bishop, completing the same "concede the ' +
          'center, attack it from the side" plan the King\'s Indian Defense uses against 1. d4.',
      },
    ],
    summary:
      '1...d6, the Pirc Defense, is a hypermodern reply to 1. e4 — instead of occupying the ' +
      'center with a pawn like the Sicilian, French, or Caro-Kann all do, Black develops ' +
      "pieces first and pressures the center from a distance, much like the King's Indian " +
      'Defense does against 1. d4. The line shown reaches a common tabiya: 1. e4 d6 2. d4 ' +
      'Nf6 3. Nc3 g6.',
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...d6',
    primaryColor: 'black',
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
