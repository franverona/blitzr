import type { Lesson } from './types'

// Paraphrased like lib/openingTheory.ts. Each line runs from a constructed
// position to mate (or promotion); the defender's replies are one
// illustrative defense, not the only one.
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
  {
    slug: 'king-and-two-rooks-vs-king',
    name: { en: 'King and Two Rooks vs. King', es: 'Rey y dos Torres contra Rey' },
    initialFen: '8/8/8/7k/8/8/8/RR4K1 w - - 0 1',
    moves: [
      {
        san: 'Ra4',
        explanation: {
          en: "One rook cuts the black king off along the fourth rank: it can't come down past it.",
          es: 'Una torre corta al rey negro por la cuarta fila: no puede bajar más allá.',
        },
      },
      {
        san: 'Kg5',
        explanation: {
          en: 'The king stays as close as it can.',
          es: 'El rey se queda lo más cerca que puede.',
        },
      },
      {
        san: 'Rb5+',
        explanation: {
          en: 'The other rook checks from the fifth rank, so the king has to move up.',
          es: 'La otra torre da jaque desde la quinta fila, así que el rey tiene que subir.',
        },
      },
      {
        san: 'Kf6',
        explanation: {
          en: 'The king steps up a rank, and heads for the center.',
          es: 'El rey sube una fila y se dirige al centro.',
        },
      },
      {
        san: 'Ra6+',
        explanation: {
          en: 'The first rook leapfrogs to the sixth rank with check.',
          es: 'La primera torre salta a la sexta fila con jaque.',
        },
      },
      { san: 'Ke7', explanation: { en: 'Up again.', es: 'Sube otra vez.' } },
      {
        san: 'Rb7+',
        explanation: {
          en: 'And the other rook takes the seventh.',
          es: 'Y la otra torre toma la séptima.',
        },
      },
      {
        san: 'Kd8',
        explanation: {
          en: 'The king is now on the edge of the board.',
          es: 'El rey ya está en el borde del tablero.',
        },
      },
      {
        san: 'Ra8#',
        explanation: {
          en: 'Checkmate: the rook on b7 covers the seventh rank and the one on a8 checks along the eighth.',
          es: 'Jaque mate: la torre de b7 cubre la séptima fila y la de a8 da jaque por la octava.',
        },
      },
    ],
    summary: {
      en: 'Two rooks mate without any help from the king. They take turns: one rook cuts the king off along a rank or file, the other gives check from the next line, and the first one then moves on to check from the line after that. Rank by rank, the king is walked to the edge of the board, where the last check is mate. Keep the rooks far from the enemy king, so it can never attack them.',
      es: 'Dos torres dan mate sin ninguna ayuda del rey. Se turnan: una torre corta al rey a lo largo de una fila o columna, la otra da jaque desde la línea siguiente, y la primera avanza a dar jaque desde la de después. Fila a fila, el rey es llevado al borde del tablero, donde el último jaque es mate. Mantén las torres lejos del rey rival, para que nunca pueda atacarlas.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess/The_Endgame/King_and_Two_Major_Pieces_vs._King',
    primaryColor: 'white',
  },
  {
    slug: 'king-and-two-bishops-vs-king',
    name: { en: 'King and Two Bishops vs. King', es: 'Rey y dos Alfiles contra Rey' },
    initialFen: '8/8/8/8/3k4/8/8/2BK1B2 w - - 0 1',
    moves: [
      {
        san: 'Ke2',
        explanation: { en: 'First, bring the king up.', es: 'Primero, acerca el rey.' },
      },
      {
        san: 'Ke4',
        explanation: {
          en: 'The black king stays central for as long as it can.',
          es: 'El rey negro se mantiene en el centro todo lo que puede.',
        },
      },
      {
        san: 'Be3',
        explanation: {
          en: 'The bishops start building their wall.',
          es: 'Los alfiles empiezan a construir su muro.',
        },
      },
      { san: 'Ke5', explanation: { en: 'The king looks for room.', es: 'El rey busca espacio.' } },
      {
        san: 'Kd3',
        explanation: {
          en: 'The white king joins the bishops.',
          es: 'El rey blanco se une a los alfiles.',
        },
      },
      {
        san: 'Kd5',
        explanation: {
          en: 'Black keeps its king near the center.',
          es: 'Las negras mantienen el rey cerca del centro.',
        },
      },
      {
        san: 'Bd4',
        explanation: {
          en: 'The dark-squared bishop takes the center.',
          es: 'El alfil de casillas oscuras ocupa el centro.',
        },
      },
      {
        san: 'Ke6',
        explanation: { en: 'The king is pushed back.', es: 'El rey es empujado hacia atrás.' },
      },
      {
        san: 'Ke4',
        explanation: {
          en: 'The white king takes the squares the black king just left.',
          es: 'El rey blanco ocupa las casillas que el rey negro acaba de dejar.',
        },
      },
      {
        san: 'Kd6',
        explanation: { en: 'Black looks for a way out.', es: 'Las negras buscan una salida.' },
      },
      {
        san: 'Bc4',
        explanation: {
          en: 'Side by side, the two bishops now form a diagonal wall.',
          es: 'Uno junto al otro, los dos alfiles forman ahora un muro diagonal.',
        },
      },
      {
        san: 'Kc6',
        explanation: {
          en: 'The king tries the queenside.',
          es: 'El rey prueba por el flanco de dama.',
        },
      },
      {
        san: 'Ke5',
        explanation: {
          en: 'The white king moves up behind the wall.',
          es: 'El rey blanco avanza detrás del muro.',
        },
      },
      { san: 'Kd7', explanation: { en: 'Black gives ground.', es: 'Las negras ceden terreno.' } },
      { san: 'Bd5', explanation: { en: 'The wall moves forward.', es: 'El muro avanza.' } },
      {
        san: 'Kc7',
        explanation: {
          en: 'The black king has fewer squares every move.',
          es: 'El rey negro tiene menos casillas en cada jugada.',
        },
      },
      {
        san: 'Bc5',
        explanation: { en: 'The other bishop steps up too.', es: 'El otro alfil también avanza.' },
      },
      { san: 'Kd7', explanation: { en: 'Waiting.', es: 'Espera.' } },
      {
        san: 'Bd6',
        explanation: {
          en: 'The bishops push the king toward the back rank.',
          es: 'Los alfiles empujan al rey hacia la última fila.',
        },
      },
      {
        san: 'Ke8',
        explanation: { en: 'The king reaches the edge.', es: 'El rey llega al borde.' },
      },
      { san: 'Ke6', explanation: { en: 'The white king follows.', es: 'El rey blanco lo sigue.' } },
      {
        san: 'Kd8',
        explanation: {
          en: 'Black keeps away from the corners.',
          es: 'Las negras se mantienen lejos de las esquinas.',
        },
      },
      {
        san: 'Bc6',
        explanation: {
          en: 'The bishops close the box from the other side.',
          es: 'Los alfiles cierran la caja por el otro lado.',
        },
      },
      {
        san: 'Kc8',
        explanation: {
          en: 'Black has to head for the queenside corner.',
          es: 'Las negras tienen que ir hacia la esquina del flanco de dama.',
        },
      },
      {
        san: 'Kd5',
        explanation: {
          en: 'The white king takes a new route to get beside the black king.',
          es: 'El rey blanco toma otra ruta para colocarse junto al rey negro.',
        },
      },
      {
        san: 'Kd8',
        explanation: { en: 'Black shuffles back and forth.', es: 'Las negras van y vienen.' },
      },
      {
        san: 'Kc5',
        explanation: {
          en: 'The king walks around the bishops.',
          es: 'El rey rodea a los alfiles.',
        },
      },
      { san: 'Kc8', explanation: { en: 'Still shuffling.', es: 'Siguen yendo y viniendo.' } },
      {
        san: 'Kb6',
        explanation: {
          en: 'Now the white king stands next to the corner.',
          es: 'Ahora el rey blanco está junto a la esquina.',
        },
      },
      {
        san: 'Kd8',
        explanation: {
          en: 'Black stays off the corner as long as it can.',
          es: 'Las negras evitan la esquina todo lo que pueden.',
        },
      },
      {
        san: 'Bc5',
        explanation: {
          en: 'Repositioning the bishops for the final push.',
          es: 'Recolocando los alfiles para el empujón final.',
        },
      },
      { san: 'Kc8', explanation: { en: 'Waiting.', es: 'Espera.' } },
      { san: 'Be7', explanation: { en: 'The bishop takes d8 away.', es: 'El alfil le quita d8.' } },
      { san: 'Kb8', explanation: { en: 'Toward the corner.', es: 'Hacia la esquina.' } },
      {
        san: 'Bd7',
        explanation: { en: 'The other bishop takes c8.', es: 'El otro alfil le quita c8.' },
      },
      { san: 'Ka8', explanation: { en: 'Into the corner.', es: 'A la esquina.' } },
      {
        san: 'Bd8',
        explanation: {
          en: 'A waiting move. The king has only b8 left; avoiding stalemate matters here.',
          es: 'Una jugada de espera. Al rey solo le queda b8; aquí importa no ahogarlo.',
        },
      },
      { san: 'Kb8', explanation: { en: 'The only move.', es: 'La única jugada.' } },
      {
        san: 'Bc7+',
        explanation: {
          en: 'Check, driving the king back into the corner.',
          es: 'Jaque, devolviendo al rey a la esquina.',
        },
      },
      { san: 'Ka8', explanation: { en: 'Forced.', es: 'Forzada.' } },
      {
        san: 'Bc6#',
        explanation: {
          en: 'Checkmate along the long diagonal.',
          es: 'Jaque mate por la gran diagonal.',
        },
      },
    ],
    summary: {
      en: "Two bishops on opposite colors can force mate, but only in a corner, and only with the king's help. Side by side, the bishops make a diagonal wall the enemy king can't cross. The king walks up behind the wall, the wall moves closer step by step, and the enemy king is pushed into a corner, where the bishops take turns checking it until it's mate. Take care not to stalemate it.",
      es: 'Dos alfiles de distinto color pueden forzar el mate, pero solo en una esquina y solo con la ayuda del rey. Uno junto al otro, los alfiles forman un muro diagonal que el rey rival no puede cruzar. El rey avanza detrás del muro, el muro se acerca paso a paso y el rey rival es empujado a una esquina, donde los alfiles se turnan para darle jaque hasta el mate. Cuidado con no ahogarlo.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Checkmate',
    primaryColor: 'white',
  },
  {
    slug: 'king-bishop-and-knight-vs-king',
    name: { en: 'King, Bishop and Knight vs. King', es: 'Rey, Alfil y Caballo contra Rey' },
    initialFen: '7k/8/5K2/4N3/8/3B4/8/8 w - - 0 1',
    moves: [
      {
        san: 'Nf7+',
        explanation: {
          en: 'The black king is in the wrong corner. A knight check starts driving it toward a8.',
          es: 'El rey negro está en la esquina equivocada. Un jaque de caballo empieza a llevarlo hacia a8.',
        },
      },
      { san: 'Kg8', explanation: { en: 'The only move.', es: 'La única jugada.' } },
      {
        san: 'Bf5',
        explanation: {
          en: 'The bishop takes away squares on the light diagonal.',
          es: 'El alfil quita casillas en la diagonal clara.',
        },
      },
      {
        san: 'Kf8',
        explanation: {
          en: 'The king runs along the back rank, toward the other corner.',
          es: 'El rey corre por la última fila, hacia la otra esquina.',
        },
      },
      {
        san: 'Bh7',
        explanation: {
          en: "The bishop covers g8, so the king can't turn back.",
          es: 'El alfil cubre g8, así que el rey no puede volver.',
        },
      },
      { san: 'Ke8', explanation: { en: 'Still running.', es: 'Sigue corriendo.' } },
      {
        san: 'Ne5',
        explanation: {
          en: 'The knight swings back toward the center.',
          es: 'El caballo vuelve hacia el centro.',
        },
      },
      {
        san: 'Kd8',
        explanation: {
          en: 'The king tries to escape toward c7.',
          es: 'El rey intenta escapar hacia c7.',
        },
      },
      {
        san: 'Ke6',
        explanation: {
          en: 'The white king follows along the sixth rank.',
          es: 'El rey blanco lo sigue por la sexta fila.',
        },
      },
      {
        san: 'Kc7',
        explanation: {
          en: 'Black heads for the queenside.',
          es: 'Las negras van hacia el flanco de dama.',
        },
      },
      {
        san: 'Nd7',
        explanation: {
          en: 'The knight blocks the way back: this is the key W manoeuvre.',
          es: 'El caballo corta la vuelta: es la clave de la maniobra en W.',
        },
      },
      { san: 'Kb7', explanation: { en: 'The king keeps going.', es: 'El rey sigue avanzando.' } },
      {
        san: 'Bd3',
        explanation: {
          en: 'The bishop comes back to control the light squares near the king.',
          es: 'El alfil vuelve para controlar las casillas claras cerca del rey.',
        },
      },
      {
        san: 'Kc6',
        explanation: { en: 'The king tries to break out.', es: 'El rey intenta escaparse.' },
      },
      {
        san: 'Be2',
        explanation: {
          en: 'The bishop keeps the king boxed in.',
          es: 'El alfil mantiene al rey encerrado.',
        },
      },
      { san: 'Kc7', explanation: { en: 'Back again.', es: 'Vuelve atrás.' } },
      {
        san: 'Bf3',
        explanation: {
          en: 'The bishop takes the long diagonal.',
          es: 'El alfil toma la gran diagonal.',
        },
      },
      { san: 'Kd8', explanation: { en: 'The king turns back.', es: 'El rey da la vuelta.' } },
      {
        san: 'Kd6',
        explanation: {
          en: 'The white king takes the opposition.',
          es: 'El rey blanco toma la oposición.',
        },
      },
      {
        san: 'Ke8',
        explanation: { en: 'Toward the h8 corner again.', es: 'Otra vez hacia la esquina de h8.' },
      },
      {
        san: 'Bh5+',
        explanation: { en: 'A check that sends it back.', es: 'Un jaque que lo hace volver.' },
      },
      { san: 'Kd8', explanation: { en: 'Forced back.', es: 'Obligado a volver.' } },
      { san: 'Bf7', explanation: { en: 'The bishop covers e8.', es: 'El alfil cubre e8.' } },
      {
        san: 'Kc8',
        explanation: { en: 'The king is being herded to a8.', es: 'El rey es conducido hacia a8.' },
      },
      {
        san: 'Nc5',
        explanation: { en: 'The knight heads for b7.', es: 'El caballo se dirige a b7.' },
      },
      { san: 'Kd8', explanation: { en: 'Back and forth.', es: 'Va y viene.' } },
      {
        san: 'Nb7+',
        explanation: { en: 'Check, driving the king back.', es: 'Jaque, haciéndolo retroceder.' },
      },
      { san: 'Kc8', explanation: { en: 'Forced.', es: 'Forzada.' } },
      {
        san: 'Kc6',
        explanation: { en: 'The white king closes in.', es: 'El rey blanco se acerca.' },
      },
      { san: 'Kb8', explanation: { en: 'Toward the corner.', es: 'Hacia la esquina.' } },
      { san: 'Kb6', explanation: { en: 'The king stands guard.', es: 'El rey vigila.' } },
      {
        san: 'Kc8',
        explanation: { en: 'The only square left.', es: 'La única casilla que queda.' },
      },
      {
        san: 'Be6+',
        explanation: {
          en: 'The bishop checks it back.',
          es: 'El alfil le da jaque y lo devuelve.',
        },
      },
      { san: 'Kb8', explanation: { en: 'Forced.', es: 'Forzada.' } },
      {
        san: 'Nc5',
        explanation: {
          en: 'The knight gets ready for the last check.',
          es: 'El caballo se prepara para el último jaque.',
        },
      },
      { san: 'Ka8', explanation: { en: 'Into the corner.', es: 'A la esquina.' } },
      {
        san: 'Bd7',
        explanation: {
          en: 'A waiting move that takes c8.',
          es: 'Una jugada de espera que le quita c8.',
        },
      },
      { san: 'Kb8', explanation: { en: 'The only move.', es: 'La única jugada.' } },
      { san: 'Na6+', explanation: { en: 'The knight checks.', es: 'El caballo da jaque.' } },
      { san: 'Ka8', explanation: { en: 'Back into the corner.', es: 'De vuelta a la esquina.' } },
      {
        san: 'Bc6#',
        explanation: {
          en: 'Checkmate in the light-squared corner.',
          es: 'Jaque mate en la esquina de casillas claras.',
        },
      },
    ],
    summary: {
      en: "Bishop and knight can mate, but only in a corner the bishop's color. Here the black king has run to the wrong corner, h8, and White's bishop is light-squared, so the king has to be marched along the edge to a8. The knight and bishop work together in a W-shaped pattern that keeps the king from escaping back to the center.",
      es: 'Alfil y caballo pueden dar mate, pero solo en una esquina del color del alfil. Aquí el rey negro ha huido a la esquina equivocada, h8, y el alfil blanco es de casillas claras, así que hay que llevar al rey por el borde hasta a8. El caballo y el alfil colaboran en un recorrido en forma de W que impide al rey volver al centro.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Bishop_and_knight_checkmate',
    primaryColor: 'white',
  },
]

export function getEndgameLesson(slug: string): Lesson | undefined {
  return ENDGAME_LESSONS.find((lesson) => lesson.slug === slug)
}
