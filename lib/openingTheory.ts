import type { Game, Lesson, LessonGameStats } from './types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// Summaries here are paraphrased in original wording, not reproduced from the
// source — the source is CC BY-SA (share-alike) and this repo is MIT, so
// verbatim text would be a licensing mismatch. Ideas aren't copyrightable,
// only specific expression, so a short original summary plus a visible link
// back for attribution and further reading sidesteps that entirely. The
// Spanish text is my own translation of that same original wording, not a
// separate paraphrase of the source — no additional licensing concern there.
export const OPENING_LESSONS: Lesson[] = [
  {
    slug: 'kings-pawn-opening',
    name: { en: "King's Pawn Opening", es: 'Apertura de Peón de Rey' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'e5',
        explanation: {
          en: "Black mirrors White's claim on the center, staking out equal space and opening lines for their own bishop and queen.",
          es: 'Las negras responden en espejo, reclamando el mismo espacio central y abriendo líneas para su propio alfil y su dama.',
        },
      },
      {
        san: 'Nf3',
        explanation: {
          en: 'White develops a knight toward the center, attacks the e5 pawn, and prepares to castle kingside.',
          es: 'Las blancas desarrollan un caballo hacia el centro, atacan el peón de e5 y se preparan para enrocar corto.',
        },
      },
      {
        san: 'Nc6',
        explanation: {
          en: 'Black develops a knight to defend e5 and adds another attacker on d4.',
          es: 'Las negras desarrollan un caballo para defender e5 y suman otro atacante sobre d4.',
        },
      },
      {
        san: 'Bb5',
        explanation: {
          en: 'White pins the knight on c6 to the king, indirectly pressuring e5 again — the starting point of the Ruy Lopez.',
          es: 'Las blancas clavan el caballo de c6 al rey, presionando e5 de forma indirecta otra vez — el punto de partida de la Apertura Española.',
        },
      },
    ],
    summary: {
      en: "1. e4 is chess's most popular opening move — it claims the center immediately and opens lines for the queen and king's bishop, setting up fast development. The line shown here is one classical way it can continue: 1. e4 e5 2. Nf3 Nc6 3. Bb5, the Ruy Lopez.",
      es: '1. e4 es la jugada de apertura más popular del ajedrez — reclama el centro de inmediato y abre líneas para la dama y el alfil de rey, preparando un desarrollo rápido. La línea que se muestra aquí es una forma clásica de continuar: 1. e4 e5 2. Nf3 Nc6 3. Bb5, la Apertura Española.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4',
    primaryColor: 'white',
  },
  {
    slug: 'sicilian-defense',
    name: { en: 'Sicilian Defense', es: 'Defensa Siciliana' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'c5',
        explanation: {
          en: "Rather than meeting e4 head-on, Black strikes from the side with a flank pawn — the idea is to trade this c-pawn for White's d-pawn later, gaining a half-open c-file and lively piece play in return for giving White a bit more central space.",
          es: 'En vez de responder de frente a e4, las negras golpean desde el flanco con un peón lateral — la idea es cambiar este peón de c por el peón de d de las blancas más adelante, ganando una columna c semiabierta y juego de piezas animado a cambio de cederle a las blancas algo más de espacio central.',
        },
      },
      {
        san: 'Nf3',
        explanation: {
          en: 'White develops a knight and prepares to build a full center with d4.',
          es: 'Las blancas desarrollan un caballo y se preparan para construir un centro completo con d4.',
        },
      },
      {
        san: 'd6',
        explanation: {
          en: "Black shores up the e5 square in advance and clears the way to develop the kingside knight and bishop, without yet committing the queen's knight or bishop.",
          es: 'Las negras refuerzan de antemano la casilla e5 y despejan el camino para desarrollar el caballo y el alfil de rey, sin comprometer todavía el caballo ni el alfil de dama.',
        },
      },
      {
        san: 'd4',
        explanation: {
          en: 'White strikes in the center, offering a pawn trade that opens the position and activates pieces on both sides.',
          es: 'Las blancas golpean en el centro, ofreciendo un cambio de peones que abre la posición y activa las piezas de ambos bandos.',
        },
      },
      {
        san: 'cxd4',
        explanation: {
          en: "Black takes — exactly the trade the Sicilian was aiming for: Black's flank c-pawn for White's central d-pawn, opening the c-file for Black's rook in the process.",
          es: 'Las negras capturan — justo el cambio que buscaba la Siciliana: el peón lateral de c de las negras por el peón central de d de las blancas, abriendo de paso la columna c para la torre negra.',
        },
      },
    ],
    summary: {
      en: "1...c5, the Sicilian Defense, is Black's single most popular reply to 1. e4 — instead of mirroring White's central pawn, Black attacks it from the side, aiming to trade the c-pawn for White's d-pawn and pick up lively counterplay on the open c-file. The line shown reaches the Open Sicilian, one of the most deeply analyzed structures in chess: 1. e4 c5 2. Nf3 d6 3. d4 cxd4.",
      es: '1...c5, la Defensa Siciliana, es la respuesta más popular de las negras a 1. e4 — en vez de responder en espejo al peón central blanco, las negras lo atacan desde el flanco, buscando cambiar el peón de c por el peón de d de las blancas y obtener contrajuego animado en la columna c abierta. La línea mostrada alcanza la Siciliana Abierta, una de las estructuras más analizadas del ajedrez: 1. e4 c5 2. Nf3 d6 3. d4 cxd4.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...c5',
    primaryColor: 'black',
  },
  {
    slug: 'french-defense',
    name: { en: 'French Defense', es: 'Defensa Francesa' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'e6',
        explanation: {
          en: "Black prepares to challenge the center with ...d5 next move, backed up by this pawn — a solid plan that costs some time, and temporarily shuts in Black's own light-squared bishop.",
          es: 'Las negras se preparan para desafiar el centro con ...d5 en la próxima jugada, respaldado por este peón — un plan sólido que cuesta algo de tiempo y encierra temporalmente al propio alfil de casillas claras de las negras.',
        },
      },
      {
        san: 'd4',
        explanation: {
          en: 'White builds a full two-pawn center, ready to meet a challenge on d5.',
          es: 'Las blancas construyen un centro completo de dos peones, listas para responder a un desafío en d5.',
        },
      },
      {
        san: 'd5',
        explanation: {
          en: "Black follows through on the plan from move one, meeting White's center directly and creating the closed, pawn-chain structure the French is known for.",
          es: 'Las negras llevan a cabo el plan trazado desde la primera jugada, enfrentando directamente el centro blanco y creando la estructura cerrada de cadena de peones por la que es conocida la Francesa.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White develops a knight, adding defense to e4 and putting a second attacker on d5 — Black now has to decide how to relieve the pressure, commonly with ...Bb4 (pinning the knight) or ...Nf6 (adding a defender).',
          es: 'Las blancas desarrollan un caballo, reforzando la defensa de e4 y sumando un segundo atacante sobre d5 — ahora las negras deben decidir cómo aliviar la presión, normalmente con ...Bb4 (clavando el caballo) o ...Nf6 (sumando un defensor).',
        },
      },
    ],
    summary: {
      en: "1...e6, the French Defense, is a solid, positional answer to 1. e4 — Black holds off on meeting the center immediately, preparing ...d5 instead. The resulting structures are famously closed and strategic: Black trades some piece activity (the French's well-known drawback is a light-squared bishop boxed in behind the e6 pawn) for a resilient pawn chain. The line shown reaches a common tabiya: 1. e4 e6 2. d4 d5 3. Nc3.",
      es: '1...e6, la Defensa Francesa, es una respuesta sólida y posicional a 1. e4 — las negras posponen enfrentar el centro de inmediato y en su lugar preparan ...d5. Las estructuras resultantes son célebremente cerradas y estratégicas: las negras ceden algo de actividad de piezas (el conocido problema de la Francesa es un alfil de casillas claras encerrado detrás del peón de e6) a cambio de una cadena de peones resistente. La línea mostrada alcanza una tabiya habitual: 1. e4 e6 2. d4 d5 3. Nc3.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...e6',
    primaryColor: 'black',
  },
  {
    slug: 'queens-gambit',
    name: { en: "Queen's Gambit", es: 'Gambito de Dama' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'd4',
        explanation: {
          en: "White claims central space with the queen's pawn instead of the king's — a touch more solid than 1. e4, opening a line for the light-squared bishop and the queen.",
          es: 'Las blancas reclaman espacio central con el peón de dama en vez del de rey — un poco más sólido que 1. e4, abriendo una línea para el alfil de casillas claras y para la dama.',
        },
      },
      {
        san: 'd5',
        explanation: {
          en: "Black mirrors White's claim on the center right away.",
          es: 'Las negras responden en espejo de inmediato, reclamando el mismo espacio central.',
        },
      },
      {
        san: 'c4',
        explanation: {
          en: "White offers a pawn — the 'gambit' — to lure Black's d-pawn away from the center or, if Black declines, to gain extra influence there instead. The pawn rarely stays won for long even when Black does take it.",
          es: "Las blancas ofrecen un peón — el 'gambito' — para alejar el peón de d de las negras del centro o, si las negras lo rechazan, ganar en cambio más influencia allí. El peón rara vez queda ganado por mucho tiempo aunque las negras lo capturen.",
        },
      },
      {
        san: 'e6',
        explanation: {
          en: 'Black declines the gambit, reinforcing d5 instead of grabbing the c4 pawn — solid, at the cost of temporarily boxing in the light-squared bishop, same trade-off the French Defense makes.',
          es: 'Las negras rechazan el gambito, reforzando d5 en lugar de capturar el peón de c4 — sólido, al costo de encerrar temporalmente el alfil de casillas claras, la misma concesión que hace la Defensa Francesa.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White develops a knight, adding a second attacker on d5.',
          es: 'Las blancas desarrollan un caballo, sumando un segundo atacante sobre d5.',
        },
      },
      {
        san: 'Nf6',
        explanation: {
          en: 'Black develops symmetrically, adding a defender of d5 and preparing to castle kingside.',
          es: 'Las negras desarrollan de forma simétrica, sumando un defensor de d5 y preparándose para enrocar corto.',
        },
      },
    ],
    summary: {
      en: "1. d4, followed by 2. c4, is the Queen's Gambit — one of the oldest and most respected ways to open a game. White offers the c-pawn to pull Black's central d-pawn away or gain extra central influence instead; Black doesn't have to accept it, and rarely holds onto it for long even when they do. The line shown reaches the Queen's Gambit Declined, one of the most classical structures in chess: 1. d4 d5 2. c4 e6 3. Nc3 Nf6.",
      es: '1. d4, seguido de 2. c4, es el Gambito de Dama — una de las formas más antiguas y respetadas de abrir una partida. Las blancas ofrecen el peón de c para alejar el peón central de d de las negras o, en su defecto, ganar más influencia central; las negras no están obligadas a aceptarlo, y rara vez lo conservan por mucho tiempo aunque lo hagan. La línea mostrada alcanza el Gambito de Dama Rehusado, una de las estructuras más clásicas del ajedrez: 1. d4 d5 2. c4 e6 3. Nc3 Nf6.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._d4/1...d5/2._c4',
    primaryColor: 'white',
  },
  {
    slug: 'italian-game',
    name: { en: 'Italian Game', es: 'Apertura Italiana' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'e5',
        explanation: {
          en: "Black mirrors White's claim on the center, staking out equal space and opening lines for their own bishop and queen.",
          es: 'Las negras responden en espejo, reclamando el mismo espacio central y abriendo líneas para su propio alfil y su dama.',
        },
      },
      {
        san: 'Nf3',
        explanation: {
          en: 'White develops a knight toward the center, attacks the e5 pawn, and prepares to castle kingside.',
          es: 'Las blancas desarrollan un caballo hacia el centro, atacan el peón de e5 y se preparan para enrocar corto.',
        },
      },
      {
        san: 'Nc6',
        explanation: {
          en: 'Black develops a knight to defend e5 and adds another attacker on d4.',
          es: 'Las negras desarrollan un caballo para defender e5 y suman otro atacante sobre d4.',
        },
      },
      {
        san: 'Bc4',
        explanation: {
          en: "White develops the other bishop straight at Black's weakest point, f7 — a more direct plan than the Ruy Lopez's pin on c6, at the cost of not pressuring e5 at all.",
          es: 'Las blancas desarrollan el otro alfil apuntando directo al punto más débil de las negras, f7 — un plan más directo que la clavada de la Española sobre c6, al costo de no presionar e5 en absoluto.',
        },
      },
      {
        san: 'Bc5',
        explanation: {
          en: 'Black mirrors the idea, developing the bishop toward White\'s own weak f2 square and completing the symmetric setup known as the Giuoco Piano — Italian for "quiet game."',
          es: 'Las negras responden en espejo, desarrollando el alfil hacia la propia casilla débil de las blancas, f2, y completando la disposición simétrica conocida como Giuoco Piano — italiano para "juego tranquilo".',
        },
      },
    ],
    summary: {
      en: "1. e4 e5 2. Nf3 Nc6 3. Bc4 is the Italian Game — one of the oldest recorded openings, and a natural alternative to the Ruy Lopez from the same starting position. Instead of pinning the knight on c6, White's bishop aims straight down the diagonal at f7, Black's most vulnerable square early in the game. The line shown reaches the Giuoco Piano, Black mirroring the same idea: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5.",
      es: '1. e4 e5 2. Nf3 Nc6 3. Bc4 es la Apertura Italiana — una de las aperturas más antiguas registradas, y una alternativa natural a la Española desde la misma posición inicial. En vez de clavar el caballo de c6, el alfil blanco apunta directo por la diagonal hacia f7, la casilla más vulnerable de las negras al inicio de la partida. La línea mostrada alcanza el Giuoco Piano, con las negras respondiendo en espejo la misma idea: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5.',
    },
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...e5/2._Nf3/2...Nc6/3._Bc4/3...Bc5',
    primaryColor: 'white',
  },
  {
    slug: 'caro-kann-defense',
    name: { en: 'Caro-Kann Defense', es: 'Defensa Caro-Kann' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'c6',
        explanation: {
          en: "Black prepares ...d5 with a pawn, same plan as the French Defense — but c6 stays out of the way of Black's own light-squared bishop, unlike the French's e6.",
          es: 'Las negras preparan ...d5 con un peón, el mismo plan que la Defensa Francesa — pero c6 no le estorba al propio alfil de casillas claras de las negras, a diferencia del e6 de la Francesa.',
        },
      },
      {
        san: 'd4',
        explanation: {
          en: 'White builds a full two-pawn center, ready to meet a challenge on d5.',
          es: 'Las blancas construyen un centro completo de dos peones, listas para responder a un desafío en d5.',
        },
      },
      {
        san: 'd5',
        explanation: {
          en: "Black follows through, meeting White's center directly with the pawn c6 was preparing to support.",
          es: 'Las negras llevan a cabo el plan, enfrentando directamente el centro blanco con el peón que c6 se preparaba para apoyar.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White develops a knight, defending e4 and adding a second attacker on d5 — Black has to decide whether to maintain the tension or resolve it.',
          es: 'Las blancas desarrollan un caballo, defendiendo e4 y sumando un segundo atacante sobre d5 — las negras deben decidir si mantienen la tensión o la resuelven.',
        },
      },
      {
        san: 'dxe4',
        explanation: {
          en: 'Black resolves the central tension right away, trading off a central pawn rather than maintaining it — one of the main plans in the Caro-Kann.',
          es: 'Las negras resuelven de inmediato la tensión central, cambiando un peón central en vez de mantenerlo — uno de los planes principales de la Caro-Kann.',
        },
      },
      {
        san: 'Nxe4',
        explanation: {
          en: 'White recaptures, centralizing the knight on an active square.',
          es: 'Las blancas recapturan, centralizando el caballo en una casilla activa.',
        },
      },
      {
        san: 'Bf5',
        explanation: {
          en: 'Black develops the light-squared bishop actively, hitting the knight on e4 and gaining a tempo — exactly the diagonal ...c6 (instead of ...e6) was played to keep open.',
          es: 'Las negras desarrollan activamente el alfil de casillas claras, golpeando el caballo de e4 y ganando un tiempo — justo la diagonal que ...c6 (en vez de ...e6) se jugó para mantener abierta.',
        },
      },
    ],
    summary: {
      en: "1...c6, the Caro-Kann Defense, is a solid answer to 1. e4 that solves the French Defense's biggest problem: Black still prepares ...d5 to meet the center head-on, but without shutting in the light-squared bishop first. The line shown reaches a classical tabiya: 1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5, Black's bishop developing actively before the rest of the position locks into place.",
      es: '1...c6, la Defensa Caro-Kann, es una respuesta sólida a 1. e4 que resuelve el mayor problema de la Defensa Francesa: las negras igual preparan ...d5 para enfrentar el centro de frente, pero sin encerrar antes al alfil de casillas claras. La línea mostrada alcanza una tabiya clásica: 1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5, con el alfil negro desarrollándose activamente antes de que el resto de la posición se fije.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...c6',
    primaryColor: 'black',
  },
  {
    slug: 'scandinavian-defense',
    name: { en: 'Scandinavian Defense', es: 'Defensa Escandinava' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'd5',
        explanation: {
          en: 'Black challenges the e4 pawn immediately, offering to trade central pawns right away rather than building up first.',
          es: 'Las negras desafían de inmediato el peón de e4, ofreciendo cambiar los peones centrales enseguida en vez de desarrollarse primero.',
        },
      },
      {
        san: 'exd5',
        explanation: {
          en: 'White captures, picking up the pawn for the moment.',
          es: 'Las blancas capturan, quedándose con el peón por el momento.',
        },
      },
      {
        san: 'Qxd5',
        explanation: {
          en: 'Black recaptures with the queen — simple and direct, but it brings the queen out early where White can attack it and gain time.',
          es: 'Las negras recapturan con la dama — simple y directo, pero saca la dama pronto, donde las blancas pueden atacarla y ganar tiempo.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White develops a knight while attacking the queen — exactly the cost Black accepted by recapturing with the queen so soon rather than developing a piece first.',
          es: 'Las blancas desarrollan un caballo mientras atacan la dama — justo el costo que las negras aceptaron al recapturar con la dama tan pronto en vez de desarrollar una pieza primero.',
        },
      },
      {
        san: 'Qa5',
        explanation: {
          en: "Black retreats to a safe, still-useful square, keeping an eye on e5 and White's king's position while getting out of the way so normal development can continue.",
          es: 'Las negras retroceden a una casilla segura y todavía útil, vigilando e5 y la posición del rey blanco mientras se apartan para que el desarrollo normal pueda continuar.',
        },
      },
    ],
    summary: {
      en: "1...d5, the Scandinavian Defense, meets White's center head-on immediately rather than easing into it — direct and easy to learn, at the cost of the tempo Black loses when White later attacks the recapturing queen. The line shown reaches one of the most common tabiyas: 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5.",
      es: '1...d5, la Defensa Escandinava, enfrenta de inmediato el centro blanco en vez de acercarse gradualmente — directa y fácil de aprender, al costo del tiempo que pierden las negras cuando las blancas atacan después a la dama que recapturó. La línea mostrada alcanza una de las tabiyas más comunes: 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...d5',
    primaryColor: 'black',
  },
  {
    slug: 'kings-indian-defense',
    name: { en: "King's Indian Defense", es: 'Defensa India de Rey' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'd4',
        explanation: {
          en: "White claims central space with the queen's pawn instead of the king's — a touch more solid than 1. e4, opening a line for the light-squared bishop and the queen.",
          es: 'Las blancas reclaman espacio central con el peón de dama en vez del de rey — un poco más sólido que 1. e4, abriendo una línea para el alfil de casillas claras y para la dama.',
        },
      },
      {
        san: 'Nf6',
        explanation: {
          en: 'Black develops a knight first rather than immediately staking a claim in the center with a pawn, keeping plans flexible and eyeing a kingside fianchetto.',
          es: 'Las negras desarrollan primero un caballo en vez de reclamar de inmediato el centro con un peón, manteniendo los planes flexibles y con la mirada puesta en un fianchetto de rey.',
        },
      },
      {
        san: 'c4',
        explanation: {
          en: 'White expands further, building toward a broad pawn center rather than developing pieces yet.',
          es: 'Las blancas se expanden más, construyendo hacia un amplio centro de peones en vez de desarrollar piezas todavía.',
        },
      },
      {
        san: 'g6',
        explanation: {
          en: 'Black prepares to fianchetto the dark-squared bishop rather than occupy the center directly — a hypermodern idea: let White build a big center now, then attack it later from the side.',
          es: 'Las negras se preparan para fianchettar el alfil de casillas oscuras en vez de ocupar el centro directamente — una idea hipermoderna: dejar que las blancas construyan un gran centro ahora, para atacarlo después desde el flanco.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White develops a knight, adding central control and preparing e4.',
          es: 'Las blancas desarrollan un caballo, sumando control central y preparando e4.',
        },
      },
      {
        san: 'Bg7',
        explanation: {
          en: 'Black completes the fianchetto — the point of the whole setup. The bishop presses the long diagonal and the center from a distance, ready to back up a later ...c5 or ...e5 strike at whatever center White builds.',
          es: 'Las negras completan el fianchetto — el objetivo de toda la disposición. El alfil presiona la diagonal larga y el centro desde la distancia, listo para respaldar un futuro golpe con ...c5 o ...e5 contra el centro que construyan las blancas.',
        },
      },
    ],
    summary: {
      en: "1...Nf6 followed by ...g6 and ...Bg7 is the King's Indian Defense — instead of meeting 1. d4 with a central pawn right away, Black lets White build a big pawn center and plans to undermine it later, backed up by a fianchettoed bishop and, often, a kingside attack. One of the most heavily analyzed defenses in chess. The line shown reaches the setup's starting point: 1. d4 Nf6 2. c4 g6 3. Nc3 Bg7.",
      es: '1...Nf6 seguido de ...g6 y ...Bg7 es la Defensa India de Rey — en vez de responder a 1. d4 con un peón central de inmediato, las negras dejan que las blancas construyan un gran centro de peones y planean socavarlo más adelante, respaldadas por un alfil fianchettado y, a menudo, un ataque en el flanco de rey. Una de las defensas más analizadas del ajedrez. La línea mostrada alcanza el punto de partida de la disposición: 1. d4 Nf6 2. c4 g6 3. Nc3 Bg7.',
    },
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._d4/1...Nf6/2._c4/2...g6/3._Nc3/3...Bg7',
    primaryColor: 'black',
  },
  {
    slug: 'english-opening',
    name: { en: 'English Opening', es: 'Apertura Inglesa' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'c4',
        explanation: {
          en: 'White claims space on the queenside with a flank pawn instead of occupying the center directly, keeping options open about whether to follow up with d4 or e4.',
          es: 'Las blancas reclaman espacio en el flanco de dama con un peón lateral en vez de ocupar el centro directamente, manteniendo abiertas las opciones de continuar con d4 o e4.',
        },
      },
      {
        san: 'e5',
        explanation: {
          en: "Black claims full central space in return — the same structure as a Sicilian Defense with colors reversed, except it's White who gets the extra tempo.",
          es: 'Las negras reclaman a cambio pleno espacio central — la misma estructura que una Defensa Siciliana con los colores invertidos, salvo que aquí son las blancas quienes ganan el tiempo extra.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White develops a knight, adding pressure toward the center while staying flexible about where the rest of the pieces go.',
          es: 'Las blancas desarrollan un caballo, sumando presión hacia el centro mientras mantienen flexibilidad sobre dónde irán el resto de las piezas.',
        },
      },
      {
        san: 'Nf6',
        explanation: {
          en: 'Black develops a knight toward the center, mirroring the same idea.',
          es: 'Las negras desarrollan un caballo hacia el centro, respondiendo en espejo la misma idea.',
        },
      },
      {
        san: 'Nf3',
        explanation: {
          en: 'White develops the other knight, still without committing the central pawns.',
          es: 'Las blancas desarrollan el otro caballo, todavía sin comprometer los peones centrales.',
        },
      },
      {
        san: 'Nc6',
        explanation: {
          en: 'Black completes symmetric development, defending e5 and preparing to expand further.',
          es: 'Las negras completan el desarrollo simétrico, defendiendo e5 y preparándose para expandirse más.',
        },
      },
    ],
    summary: {
      en: "1. c4, the English Opening, is the fourth most popular first move in chess — a flank pawn that keeps White's central plans flexible rather than committing to d4 or e4 immediately, while discouraging an early ...d5 from Black. The line shown reaches a reversed Sicilian structure, both sides just developing naturally: 1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6.",
      es: '1. c4, la Apertura Inglesa, es la cuarta jugada inicial más popular del ajedrez — un peón lateral que mantiene flexibles los planes centrales de las blancas en vez de comprometerse de inmediato con d4 o e4, mientras desalienta un ...d5 temprano de las negras. La línea mostrada alcanza una estructura de Siciliana invertida, con ambos bandos simplemente desarrollándose con naturalidad: 1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._c4/1...e5',
    primaryColor: 'white',
  },
  {
    slug: 'nimzo-indian-defense',
    name: { en: 'Nimzo-Indian Defense', es: 'Defensa Nimzoindia' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'd4',
        explanation: {
          en: "White claims central space with the queen's pawn instead of the king's — a touch more solid than 1. e4, opening a line for the light-squared bishop and the queen.",
          es: 'Las blancas reclaman espacio central con el peón de dama en vez del de rey — un poco más sólido que 1. e4, abriendo una línea para el alfil de casillas claras y para la dama.',
        },
      },
      {
        san: 'Nf6',
        explanation: {
          en: 'Black develops a knight first rather than immediately staking a claim in the center with a pawn, keeping plans flexible.',
          es: 'Las negras desarrollan primero un caballo en vez de reclamar de inmediato el centro con un peón, manteniendo los planes flexibles.',
        },
      },
      {
        san: 'c4',
        explanation: {
          en: 'White expands further, building toward a broad pawn center rather than developing pieces yet.',
          es: 'Las blancas se expanden más, construyendo hacia un amplio centro de peones en vez de desarrollar piezas todavía.',
        },
      },
      {
        san: 'e6',
        explanation: {
          en: 'Black prepares to develop the dark-squared bishop actively next move, while keeping the option of a solid central setup with ...d5 later.',
          es: 'Las negras se preparan para desarrollar activamente el alfil de casillas oscuras en la próxima jugada, manteniendo la opción de una disposición central sólida con ...d5 más adelante.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White develops a knight, adding central control and preparing e4.',
          es: 'Las blancas desarrollan un caballo, sumando control central y preparando e4.',
        },
      },
      {
        san: 'Bb4',
        explanation: {
          en: "Black pins the knight to White's king, preventing e4 and pressuring the center indirectly rather than occupying it — the defining idea of the Nimzo-Indian, one of the most respected defenses to 1. d4.",
          es: 'Las negras clavan el caballo al rey blanco, impidiendo e4 y presionando el centro de forma indirecta en vez de ocuparlo — la idea definitoria de la Nimzoindia, una de las defensas más respetadas contra 1. d4.',
        },
      },
    ],
    summary: {
      en: '1...Nf6 followed by ...e6 and ...Bb4 is the Nimzo-Indian Defense — instead of meeting 1. d4 with a central pawn, Black develops a piece straight to an active pin, stopping White from building an ideal center with e4 and often accepting doubled pawns from White in exchange for the bishop pair or a favorable structure later. The line shown reaches the starting point: 1. d4 Nf6 2. c4 e6 3. Nc3 Bb4.',
      es: '1...Nf6 seguido de ...e6 y ...Bb4 es la Defensa Nimzoindia — en vez de responder a 1. d4 con un peón central, las negras desarrollan una pieza directo a una clavada activa, impidiendo que las blancas construyan un centro ideal con e4 y aceptando a menudo peones doblados de las blancas a cambio de la pareja de alfiles o una estructura favorable más adelante. La línea mostrada alcanza el punto de partida: 1. d4 Nf6 2. c4 e6 3. Nc3 Bb4.',
    },
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._d4/1...Nf6/2._c4/2...e6/3._Nc3/3...Bb4',
    primaryColor: 'black',
  },
  {
    slug: 'grunfeld-defense',
    name: { en: 'Grünfeld Defense', es: 'Defensa Grünfeld' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'd4',
        explanation: {
          en: "White claims central space with the queen's pawn instead of the king's — a touch more solid than 1. e4, opening a line for the light-squared bishop and the queen.",
          es: 'Las blancas reclaman espacio central con el peón de dama en vez del de rey — un poco más sólido que 1. e4, abriendo una línea para el alfil de casillas claras y para la dama.',
        },
      },
      {
        san: 'Nf6',
        explanation: {
          en: 'Black develops a knight first rather than immediately staking a claim in the center with a pawn, keeping plans flexible.',
          es: 'Las negras desarrollan primero un caballo en vez de reclamar de inmediato el centro con un peón, manteniendo los planes flexibles.',
        },
      },
      {
        san: 'c4',
        explanation: {
          en: 'White expands further, building toward a broad pawn center rather than developing pieces yet.',
          es: 'Las blancas se expanden más, construyendo hacia un amplio centro de peones en vez de desarrollar piezas todavía.',
        },
      },
      {
        san: 'g6',
        explanation: {
          en: 'Black prepares to fianchetto the dark-squared bishop rather than occupy the center directly — a hypermodern idea: let White build a big center now, then attack it later from the side.',
          es: 'Las negras se preparan para fianchettar el alfil de casillas oscuras en vez de ocupar el centro directamente — una idea hipermoderna: dejar que las blancas construyan un gran centro ahora, para atacarlo después desde el flanco.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White develops a knight, adding central control and preparing e4.',
          es: 'Las blancas desarrollan un caballo, sumando control central y preparando e4.',
        },
      },
      {
        san: 'd5',
        explanation: {
          en: "Black immediately strikes at White's center with a pawn instead of completing the fianchetto first — unlike the King's Indian's ...Bg7, this challenges the center right away, most famously seen in Fischer's \"Game of the Century.\"",
          es: 'Las negras golpean de inmediato el centro blanco con un peón en vez de completar primero el fianchetto — a diferencia del ...Bg7 de la India de Rey, esto desafía el centro enseguida, visto de forma célebre en la "Partida del Siglo" de Fischer.',
        },
      },
    ],
    summary: {
      en: "1...Nf6 2...g6 followed by 3...d5 is the Grünfeld Defense — it shares its first moves with the King's Indian Defense, but strikes at White's center immediately with a pawn instead of finishing the fianchetto first, usually leading to open, symmetrical-pawn-trade positions rather than the closed middlegames the King's Indian is known for. The line shown reaches the classic starting position: 1. d4 Nf6 2. c4 g6 3. Nc3 d5.",
      es: '1...Nf6 2...g6 seguido de 3...d5 es la Defensa Grünfeld — comparte sus primeras jugadas con la Defensa India de Rey, pero golpea de inmediato el centro blanco con un peón en vez de terminar primero el fianchetto, lo que suele llevar a posiciones abiertas con cambios simétricos de peones en vez de los medios juegos cerrados por los que es conocida la India de Rey. La línea mostrada alcanza la posición inicial clásica: 1. d4 Nf6 2. c4 g6 3. Nc3 d5.',
    },
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._d4/1...Nf6/2._c4/2...g6/3._Nc3/3...d5',
    primaryColor: 'black',
  },
  {
    slug: 'kings-gambit',
    name: { en: "King's Gambit", es: 'Gambito de Rey' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'e5',
        explanation: {
          en: "Black mirrors White's claim on the center, staking out equal space and opening lines for their own bishop and queen.",
          es: 'Las negras responden en espejo, reclamando el mismo espacio central y abriendo líneas para su propio alfil y su dama.',
        },
      },
      {
        san: 'f4',
        explanation: {
          en: 'White offers a second pawn to rip open the center and the f-file for a fast, aggressive attack — one of the oldest and most romantic gambits in chess.',
          es: 'Las blancas ofrecen un segundo peón para abrir de golpe el centro y la columna f en busca de un ataque rápido y agresivo — uno de los gambitos más antiguos y románticos del ajedrez.',
        },
      },
      {
        san: 'exf4',
        explanation: {
          en: "Black accepts, grabbing the pawn — sharp and double-edged for both sides, and the main reason this line is called the King's Gambit Accepted.",
          es: 'Las negras aceptan, capturando el peón — agudo y de doble filo para ambos bandos, y la razón principal por la que esta línea se llama Gambito de Rey Aceptado.',
        },
      },
      {
        san: 'Nf3',
        explanation: {
          en: 'White develops with tempo, stopping ...Qh4+ from harassing the king and preparing to win back the pawn or build a big center with d4.',
          es: 'Las blancas desarrollan con tiempo, impidiendo que ...Dh4+ hostigue al rey y preparándose para recuperar el peón o construir un gran centro con d4.',
        },
      },
    ],
    summary: {
      en: "1. e4 e5 2. f4 is the King's Gambit — White offers a second pawn straight out of the opening to blow the position open and attack fast, at the risk of falling behind in material if the attack doesn't land. Once among the most popular openings in chess, now more of a surprise weapon. The line shown reaches the King's Gambit Accepted: 1. e4 e5 2. f4 exf4 3. Nf3.",
      es: '1. e4 e5 2. f4 es el Gambito de Rey — las blancas ofrecen un segundo peón desde el principio de la apertura para abrir la posición de golpe y atacar rápido, a riesgo de quedar por detrás en material si el ataque no llega a buen puerto. Alguna vez entre las aperturas más populares del ajedrez, hoy más bien un arma sorpresa. La línea mostrada alcanza el Gambito de Rey Aceptado: 1. e4 e5 2. f4 exf4 3. Nf3.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...e5/2._f4',
    primaryColor: 'white',
  },
  {
    slug: 'scotch-game',
    name: { en: 'Scotch Game', es: 'Apertura Escocesa' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'e5',
        explanation: {
          en: "Black mirrors White's claim on the center, staking out equal space and opening lines for their own bishop and queen.",
          es: 'Las negras responden en espejo, reclamando el mismo espacio central y abriendo líneas para su propio alfil y su dama.',
        },
      },
      {
        san: 'Nf3',
        explanation: {
          en: 'White develops a knight toward the center, attacks the e5 pawn, and prepares to castle kingside.',
          es: 'Las blancas desarrollan un caballo hacia el centro, atacan el peón de e5 y se preparan para enrocar corto.',
        },
      },
      {
        san: 'Nc6',
        explanation: {
          en: 'Black develops a knight to defend e5 and adds another attacker on d4.',
          es: 'Las negras desarrollan un caballo para defender e5 y suman otro atacante sobre d4.',
        },
      },
      {
        san: 'd4',
        explanation: {
          en: 'Rather than developing a bishop first like the Italian Game or Ruy Lopez, White strikes in the center immediately, aiming to open the position before Black finishes developing.',
          es: 'En vez de desarrollar primero un alfil como en la Italiana o la Española, las blancas golpean de inmediato en el centro, buscando abrir la posición antes de que las negras terminen de desarrollarse.',
        },
      },
      {
        san: 'exd4',
        explanation: {
          en: 'Black takes the pawn — played almost automatically here — and White will recapture with the knight next, landing it on an active central square.',
          es: 'Las negras capturan el peón — una jugada casi automática aquí — y las blancas recapturarán con el caballo a continuación, situándolo en una casilla central activa.',
        },
      },
    ],
    summary: {
      en: "1. e4 e5 2. Nf3 Nc6 3. d4 is the Scotch Game — a direct alternative to the Italian Game and Ruy Lopez from the same starting position, opening the center immediately instead of developing a bishop first. The line shown reaches Black's near-automatic reply: 1. e4 e5 2. Nf3 Nc6 3. d4 exd4.",
      es: '1. e4 e5 2. Nf3 Nc6 3. d4 es la Apertura Escocesa — una alternativa directa a la Italiana y la Española desde la misma posición inicial, abriendo el centro de inmediato en vez de desarrollar primero un alfil. La línea mostrada alcanza la respuesta casi automática de las negras: 1. e4 e5 2. Nf3 Nc6 3. d4 exd4.',
    },
    sourceUrl:
      'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...e5/2._Nf3/2...Nc6/3._d4',
    primaryColor: 'white',
  },
  {
    slug: 'pirc-defense',
    name: { en: 'Pirc Defense', es: 'Defensa Pirc' },
    initialFen: START_FEN,
    moves: [
      {
        san: 'e4',
        explanation: {
          en: "White pushes the king's pawn two squares, claiming central space and opening a diagonal for the bishop on f1 and a line for the queen.",
          es: 'Las blancas avanzan el peón de rey dos casillas, ganando espacio central y abriendo una diagonal para el alfil de f1 y una línea para la dama.',
        },
      },
      {
        san: 'd6',
        explanation: {
          en: "Black doesn't contest the center with a pawn at all yet, planning to develop pieces first and strike back later — a hypermodern idea similar in spirit to the King's Indian Defense, just against 1. e4 instead of 1. d4.",
          es: 'Las negras no disputan el centro con un peón todavía, planeando desarrollar piezas primero y contraatacar más adelante — una idea hipermoderna similar en espíritu a la Defensa India de Rey, solo que contra 1. e4 en vez de 1. d4.',
        },
      },
      {
        san: 'd4',
        explanation: {
          en: "White takes full central space, since Black hasn't contested it directly.",
          es: 'Las blancas toman pleno espacio central, ya que las negras no lo han disputado directamente.',
        },
      },
      {
        san: 'Nf6',
        explanation: {
          en: 'Black develops, attacking e4 and preparing to fianchetto next.',
          es: 'Las negras se desarrollan, atacando e4 y preparándose para fianchettar a continuación.',
        },
      },
      {
        san: 'Nc3',
        explanation: {
          en: 'White defends e4 and develops a piece.',
          es: 'Las blancas defienden e4 y desarrollan una pieza.',
        },
      },
      {
        san: 'g6',
        explanation: {
          en: 'Black fianchettoes the dark-squared bishop, completing the same "concede the center, attack it from the side" plan the King\'s Indian Defense uses against 1. d4.',
          es: 'Las negras fianchettan el alfil de casillas oscuras, completando el mismo plan de "ceder el centro, atacarlo desde el flanco" que la Defensa India de Rey usa contra 1. d4.',
        },
      },
    ],
    summary: {
      en: "1...d6, the Pirc Defense, is a hypermodern reply to 1. e4 — instead of occupying the center with a pawn like the Sicilian, French, or Caro-Kann all do, Black develops pieces first and pressures the center from a distance, much like the King's Indian Defense does against 1. d4. The line shown reaches a common tabiya: 1. e4 d6 2. d4 Nf6 3. Nc3 g6.",
      es: '1...d6, la Defensa Pirc, es una respuesta hipermoderna a 1. e4 — en vez de ocupar el centro con un peón como hacen la Siciliana, la Francesa o la Caro-Kann, las negras desarrollan piezas primero y presionan el centro desde la distancia, de forma muy parecida a como la Defensa India de Rey lo hace contra 1. d4. La línea mostrada alcanza una tabiya habitual: 1. e4 d6 2. d4 Nf6 3. Nc3 g6.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess_Opening_Theory/1._e4/1...d6',
    primaryColor: 'black',
  },
]

export function getOpeningLesson(slug: string): Lesson | undefined {
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
