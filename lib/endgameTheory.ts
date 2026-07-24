import type { Lesson } from './types'

// Same "original paraphrase, not reproduced text" approach as
// lib/openingTheory.ts — see that file's own comment for why. Unlike an
// opening line, every move sequence here is a complete, concrete
// demonstration of the technique from a constructed starting position all
// the way to an actual checkmate (or, for the pawn-ending lesson, to the
// pawn queening) — each verified for legality and the correct final
// position with a chess.js scratch script before being treated as correct,
// not eyeballed. The defending king's replies are one illustrative defense,
// not a claim that it's the only one — same limitation the opening lessons'
// quiz mode already has.
export const ENDGAME_LESSONS: Lesson[] = [
  {
    slug: 'king-and-queen-vs-king',
    name: { en: 'King and Queen vs. King', es: 'Rey y Dama contra Rey' },
    initialFen: '8/8/8/4k3/8/8/4K3/3Q4 w - - 0 1',
    moves: [
      {
        san: 'Qd3',
        explanation: {
          en: "White brings the queen a knight's move away from the black king, cutting off the d-file and 3rd rank without checking — a check here would just push the king toward the center, giving it more room.",
          es: 'Las blancas llevan la dama a la distancia de un movimiento de caballo del rey negro, cortando la columna d y la 3ª fila sin dar jaque — un jaque aquí solo empujaría al rey hacia el centro, dándole más espacio.',
        },
      },
      {
        san: 'Kf4',
        explanation: {
          en: "Black's king tests the boundary of the box the queen has created.",
          es: 'El rey negro pone a prueba el límite de la caja que ha creado la dama.',
        },
      },
      {
        san: 'Kf2',
        explanation: {
          en: 'White brings the king closer — the queen alone can restrict the king, but the king is needed to actually deliver mate.',
          es: 'Las blancas acercan su rey — la dama sola puede restringir al rey, pero se necesita el rey para dar mate.',
        },
      },
      {
        san: 'Kg4',
        explanation: {
          en: "Black's king edges toward the kingside, still trapped inside the queen's box.",
          es: 'El rey negro se desplaza hacia el flanco de rey, todavía atrapado dentro de la caja de la dama.',
        },
      },
      {
        san: 'Qg3+',
        explanation: {
          en: "The queen shrinks the box further, safely — it's defended by the white king, so the black king can't capture it.",
          es: 'La dama reduce aún más la caja, con seguridad — está defendida por el rey blanco, así que el rey negro no puede capturarla.',
        },
      },
      {
        san: 'Kh5',
        explanation: {
          en: 'Forced to the edge of the board.',
          es: 'Obligado al borde del tablero.',
        },
      },
      {
        san: 'Kf3',
        explanation: {
          en: "White's king continues its approach.",
          es: 'El rey blanco continúa su acercamiento.',
        },
      },
      {
        san: 'Kh6',
        explanation: {
          en: 'The only way to stay on the board.',
          es: 'La única forma de seguir en el tablero.',
        },
      },
      {
        san: 'Kf4',
        explanation: {
          en: 'White keeps closing the distance.',
          es: 'Las blancas siguen acortando la distancia.',
        },
      },
      {
        san: 'Kh7',
        explanation: {
          en: 'Retreating toward the corner — exactly where White wants it.',
          es: 'Retrocede hacia la esquina — justo donde quieren las blancas.',
        },
      },
      {
        san: 'Kg5',
        explanation: {
          en: "White's king takes up a controlling post next to the queen.",
          es: 'El rey blanco toma un puesto de control junto a la dama.',
        },
      },
      {
        san: 'Kh8',
        explanation: {
          en: 'Cornered.',
          es: 'Acorralado.',
        },
      },
      {
        san: 'Kg6',
        explanation: {
          en: 'The final approach — with the king this close, mate is only a move away.',
          es: 'El acercamiento final — con el rey tan cerca, el mate está a solo una jugada.',
        },
      },
      {
        san: 'Kg8',
        explanation: {
          en: 'The only legal move.',
          es: 'La única jugada legal.',
        },
      },
      {
        san: 'Qb8#',
        explanation: {
          en: 'Checkmate — the queen delivers mate along the back rank while the white king cuts off every escape square.',
          es: 'Jaque mate — la dama da mate a lo largo de la última fila mientras el rey blanco corta todas las casillas de escape.',
        },
      },
    ],
    summary: {
      en: 'King and Queen vs. King is the simplest checkmating technique to learn: the queen alone can restrict the lone king to a small area without ever needing to check it — checking early just gives the king more escape squares. Bring the king up to help, keep shrinking the box, and mate follows once the king is pinned to the edge of the board.',
      es: 'Rey y Dama contra Rey es la técnica de mate más sencilla de aprender: la dama sola puede restringir al rey solitario a un área pequeña sin necesidad de darle jaque nunca — un jaque temprano solo le da más casillas de escape. Acerca tu rey para ayudar, sigue reduciendo la caja, y el mate llega en cuanto el rey queda contra el borde del tablero.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess/The_Endgame/King_and_Queen_vs._King',
    primaryColor: 'white',
  },
  {
    slug: 'king-and-rook-vs-king',
    name: { en: 'King and Rook vs. King', es: 'Rey y Torre contra Rey' },
    initialFen: '8/8/8/4k3/8/8/4K3/3R4 w - - 0 1',
    moves: [
      {
        san: 'Ke3',
        explanation: {
          en: 'With the rook already cutting off the d-file, White starts bringing the king up — the rook can restrict the king, but the king is needed to finish the job.',
          es: 'Con la torre ya cortando la columna d, las blancas empiezan a acercar el rey — la torre puede restringir al rey, pero se necesita el rey para terminar el trabajo.',
        },
      },
      {
        san: 'Kf5',
        explanation: {
          en: "Black's king is confined to the kingside by the rook on the d-file.",
          es: 'El rey negro está confinado al flanco de rey por la torre en la columna d.',
        },
      },
      {
        san: 'Kf3',
        explanation: {
          en: "White's king keeps approaching, staying a safe distance from the black king.",
          es: 'El rey blanco sigue acercándose, manteniendo una distancia segura del rey negro.',
        },
      },
      {
        san: 'Kg5',
        explanation: {
          en: 'Still boxed in.',
          es: 'Todavía encerrado.',
        },
      },
      {
        san: 'Kg3',
        explanation: {
          en: 'White takes the opposition — same file, one square between the kings — which will let White push the black king back.',
          es: 'Las blancas toman la oposición — misma columna, una casilla entre los reyes — lo que permitirá empujar al rey negro hacia atrás.',
        },
      },
      {
        san: 'Kh5',
        explanation: {
          en: 'Black tries the edge of the board.',
          es: 'Las negras prueban el borde del tablero.',
        },
      },
      {
        san: 'Rd5+',
        explanation: {
          en: 'With the black king cut off from slipping back down the board, the rook safely checks along the rank, driving the king up toward the edge.',
          es: 'Con el rey negro sin poder escabullirse hacia abajo, la torre da jaque con seguridad a lo largo de la fila, empujando al rey hacia el borde.',
        },
      },
      {
        san: 'Kh6',
        explanation: {
          en: 'Forced back.',
          es: 'Obligado a retroceder.',
        },
      },
      {
        san: 'Kg4',
        explanation: {
          en: "White's king continues marching up in support.",
          es: 'El rey blanco sigue avanzando en apoyo.',
        },
      },
      {
        san: 'Kh7',
        explanation: {
          en: 'Retreating toward the corner.',
          es: 'Retrocediendo hacia la esquina.',
        },
      },
      {
        san: 'Kg5',
        explanation: {
          en: 'Closer still.',
          es: 'Más cerca todavía.',
        },
      },
      {
        san: 'Kh8',
        explanation: {
          en: 'Cornered.',
          es: 'Acorralado.',
        },
      },
      {
        san: 'Kg6',
        explanation: {
          en: 'The king takes the key square next to the rook — mate is now unavoidable.',
          es: 'El rey ocupa la casilla clave junto a la torre — el mate ya es inevitable.',
        },
      },
      {
        san: 'Kg8',
        explanation: {
          en: 'The only legal move.',
          es: 'La única jugada legal.',
        },
      },
      {
        san: 'Rd8#',
        explanation: {
          en: 'Checkmate along the back rank — the white king covers every square the black king could have escaped to.',
          es: 'Jaque mate a lo largo de la última fila — el rey blanco cubre todas las casillas por las que podría haber escapado el rey negro.',
        },
      },
    ],
    summary: {
      en: 'King and Rook vs. King is the checkmate every beginner needs cold — it comes up constantly once you start winning material. The rook cuts the lone king off along a file or rank, the attacking king walks up to help shrink the box, and mate comes on the edge of the board once the two pieces work together.',
      es: 'Rey y Torre contra Rey es el mate que todo principiante necesita dominar de memoria — aparece constantemente en cuanto empiezas a ganar material. La torre corta al rey solitario a lo largo de una columna o fila, el rey atacante avanza para ayudar a reducir la caja, y el mate llega en el borde del tablero cuando las dos piezas trabajan juntas.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess/The_Endgame/King_and_Rook_vs._King',
    primaryColor: 'white',
  },
  {
    slug: 'king-and-pawn-vs-king',
    name: { en: 'King and Pawn vs. King', es: 'Rey y Peón contra Rey' },
    initialFen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
    moves: [
      {
        san: 'Kf6',
        explanation: {
          en: "White's king is already in front of the pawn but can't advance it straight ahead — the black king is directly in the way. So White sidesteps to outflank it instead.",
          es: 'El rey blanco ya está delante del peón, pero no puede avanzarlo en línea recta — el rey negro está justo en el camino. Así que las blancas se desplazan hacia un lado para flanquearlo.',
        },
      },
      {
        san: 'Kf8',
        explanation: {
          en: "Black's king shadows White's, staying in front of the pawn's path.",
          es: 'El rey negro sigue de cerca al blanco, manteniéndose delante del camino del peón.',
        },
      },
      {
        san: 'e6',
        explanation: {
          en: 'With the e6 square now clear, the pawn advances.',
          es: 'Con la casilla e6 ahora libre, el peón avanza.',
        },
      },
      {
        san: 'Ke8',
        explanation: {
          en: "Black's king falls back to stay in front of the pawn.",
          es: 'El rey negro retrocede para seguir delante del peón.',
        },
      },
      {
        san: 'e7',
        explanation: {
          en: "The pawn pushes to the seventh rank, defended by the white king — Black's king can't capture it and can't stay in front of it either.",
          es: 'El peón avanza a la séptima fila, defendido por el rey blanco — el rey negro no puede capturarlo ni tampoco quedarse delante de él.',
        },
      },
      {
        san: 'Kd7',
        explanation: {
          en: 'The only legal move — the pawn itself now controls both d8 and f8.',
          es: 'La única jugada legal — el propio peón ahora controla tanto d8 como f8.',
        },
      },
      {
        san: 'e8=Q+',
        explanation: {
          en: "The pawn promotes to a new queen, with check — this is the payoff of getting the king in front of the pawn early: the defending king simply can't stop the promotion.",
          es: 'El peón corona en una nueva dama, con jaque — esta es la recompensa de adelantar el rey delante del peón desde el principio: el rey defensor simplemente no puede impedir la coronación.',
        },
      },
    ],
    summary: {
      en: 'King and Pawn vs. King is about converting a simple material edge into a new queen — and it hinges on opposition: whoever is *not* to move when the kings face off one square apart holds a decisive edge. Get your king in front of your pawn, meet a blocking king by stepping sideways instead of forcing things, and the pawn queens on its own.',
      es: 'Rey y Peón contra Rey trata de convertir una simple ventaja de material en una dama nueva — y depende de la oposición: quien *no* tiene que mover cuando los reyes se enfrentan separados por una casilla tiene una ventaja decisiva. Pon tu rey delante de tu peón, responde a un rey que bloquea desplazándote hacia un lado en vez de forzar las cosas, y el peón corona solo.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess/The_Endgame/Pawn_Endings',
    primaryColor: 'white',
  },
]

export function getEndgameLesson(slug: string): Lesson | undefined {
  return ENDGAME_LESSONS.find((lesson) => lesson.slug === slug)
}
