import type { Lesson } from './types'

// Classic theoretical positions, paraphrased like lib/endgameTheory.ts. Each line is the source's
// main line, not every defense; unlike endgame lessons, a line can end before mate or promotion.
export const POSITION_LESSONS: Lesson[] = [
  {
    slug: 'philidor-position',
    name: { en: 'Philidor Defense in Rook Endgames', es: 'Defensa Philidor en final de torres' },
    // The source's diagram with colors swapped, so the defender is Black and White moves first.
    initialFen: '4k3/7R/r7/4PK2/8/8/8/8 w - - 0 1',
    moves: [
      {
        san: 'Rb7',
        explanation: {
          en: "White's rook moves around, looking for a way to bring the king forward.",
          es: 'La torre blanca maniobra buscando la forma de hacer avanzar al rey.',
        },
      },
      {
        san: 'Rc6',
        explanation: {
          en: "The key idea: Black's rook guards the sixth rank, so the white king can't step up next to its pawn. Black just waits along that rank.",
          es: 'La idea clave: la torre negra vigila la sexta fila, así que el rey blanco no puede avanzar junto a su peón. Las negras simplemente esperan en esa fila.',
        },
      },
      {
        san: 'Ra7',
        explanation: {
          en: 'White has no way through, so it waits too.',
          es: 'Las blancas no encuentran paso, así que también esperan.',
        },
      },
      {
        san: 'Rb6',
        explanation: {
          en: "Black keeps waiting on the sixth rank. The black king stays on the pawn's file, in front of it.",
          es: 'Las negras siguen esperando en la sexta fila. El rey negro se queda en la columna del peón, delante de él.',
        },
      },
      {
        san: 'e6',
        explanation: {
          en: 'The only try left is to push the pawn. But now the pawn no longer shelters the white king from checks from behind.',
          es: 'El único intento que queda es avanzar el peón. Pero ahora el peón ya no protege al rey blanco de los jaques por detrás.',
        },
      },
      {
        san: 'Rb1',
        explanation: {
          en: 'The moment the pawn reaches the sixth rank, the rook goes all the way back, as far from the king as possible, ready to check it from behind.',
          es: 'En cuanto el peón llega a la sexta fila, la torre se va lo más lejos posible del rey, lista para darle jaque por detrás.',
        },
      },
      {
        san: 'Kf6',
        explanation: {
          en: 'The white king finally moves up beside its pawn.',
          es: 'El rey blanco por fin avanza junto a su peón.',
        },
      },
      {
        san: 'Rf1+',
        explanation: {
          en: 'Checks from behind begin. The king has nowhere to hide: its own pawn is in front of it.',
          es: 'Empiezan los jaques por detrás. El rey no tiene dónde esconderse: su propio peón está delante.',
        },
      },
      {
        san: 'Ke5',
        explanation: {
          en: 'The king has to step back.',
          es: 'El rey tiene que retroceder.',
        },
      },
      {
        san: 'Re1+',
        explanation: {
          en: 'Black keeps checking.',
          es: 'Las negras siguen dando jaque.',
        },
      },
      {
        san: 'Kf5',
        explanation: {
          en: 'The king tries the other side.',
          es: 'El rey prueba por el otro lado.',
        },
      },
      {
        san: 'Rf1+',
        explanation: {
          en: 'Another check.',
          es: 'Otro jaque.',
        },
      },
      {
        san: 'Ke4',
        explanation: {
          en: 'The king retreats again, now even further away from its pawn.',
          es: 'El rey vuelve a retroceder, ahora aún más lejos de su peón.',
        },
      },
      {
        san: 'Re1+',
        explanation: {
          en: "The checks never run out: if the king walks up to the rook, it leaves the pawn, and Black wins it. It's a draw.",
          es: 'Los jaques no se acaban: si el rey se acerca a la torre, abandona el peón y las negras lo ganan. Son tablas.',
        },
      },
    ],
    summary: {
      en: "The Philidor position is the basic way to draw a rook and pawn against rook endgame. Keep your king in front of the pawn and your rook on your third rank from the bottom (the sixth rank here) so the enemy king can't come forward. Once the pawn steps onto that rank, move the rook to the far end of the board and check the king from behind. It has nowhere to hide.",
      es: 'La posición de Philidor es la forma básica de hacer tablas en un final de torre y peón contra torre. Mantén tu rey delante del peón y tu torre en tu tercera fila (aquí la sexta) para que el rey rival no pueda avanzar. En cuanto el peón pisa esa fila, lleva la torre al otro extremo del tablero y da jaque al rey por detrás: no tiene dónde esconderse.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Philidor_position',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'lucena-position',
    name: { en: 'Lucena Position', es: 'Posición de Lucena' },
    initialFen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    moves: [
      {
        san: 'Rd1+',
        explanation: {
          en: "White's king is stuck in front of its own pawn. First, a check pushes the black king one more file away.",
          es: 'El rey blanco está atrapado delante de su propio peón. Primero, un jaque aleja al rey negro una columna más.',
        },
      },
      {
        san: 'Ke7',
        explanation: {
          en: 'The black king has to step aside.',
          es: 'El rey negro tiene que apartarse.',
        },
      },
      {
        san: 'Rd4',
        explanation: {
          en: 'The key move: the rook goes to the fourth rank, ready to block checks later. This is "building a bridge."',
          es: 'La jugada clave: la torre va a la cuarta fila, lista para tapar los jaques más adelante. Es "construir el puente".',
        },
      },
      {
        san: 'Ra1',
        explanation: {
          en: 'Black waits, ready to check the king as soon as it comes out.',
          es: 'Las negras esperan, listas para dar jaque al rey en cuanto salga.',
        },
      },
      {
        san: 'Kc7',
        explanation: {
          en: 'The king steps out from in front of the pawn.',
          es: 'El rey sale de delante del peón.',
        },
      },
      {
        san: 'Rc1+',
        explanation: {
          en: "Black's only resource: checks.",
          es: 'El único recurso de las negras: dar jaques.',
        },
      },
      {
        san: 'Kb6',
        explanation: {
          en: 'The king walks down the board toward its rook, staying next to the pawn.',
          es: 'El rey baja por el tablero hacia su torre, sin alejarse del peón.',
        },
      },
      {
        san: 'Rb1+',
        explanation: {
          en: 'Another check.',
          es: 'Otro jaque.',
        },
      },
      {
        san: 'Kc6',
        explanation: {
          en: 'The king keeps stepping down.',
          es: 'El rey sigue bajando.',
        },
      },
      {
        san: 'Rc1+',
        explanation: {
          en: 'Black keeps checking.',
          es: 'Las negras siguen dando jaque.',
        },
      },
      {
        san: 'Kb5',
        explanation: {
          en: 'Now the king stands right above its rook on the fourth rank.',
          es: 'Ahora el rey está justo encima de su torre de la cuarta fila.',
        },
      },
      {
        san: 'Rb1+',
        explanation: {
          en: 'One last check.',
          es: 'Un último jaque.',
        },
      },
      {
        san: 'Rb4',
        explanation: {
          en: "The bridge is complete: the rook blocks the check, and Black can't stop the pawn from promoting. White wins.",
          es: 'El puente está completo: la torre tapa el jaque y las negras no pueden impedir que el peón corone. Ganan las blancas.',
        },
      },
    ],
    summary: {
      en: 'The Lucena position is the basic win in rook and pawn against rook, when your pawn has reached the seventh rank with your king in front of it. The king has to get out, but the enemy rook checks it from the side. Put your rook on the fourth rank first, then walk the king out. When the checks come, the rook blocks them, like a bridge.',
      es: 'La posición de Lucena es la victoria básica en torre y peón contra torre, cuando tu peón ha llegado a la séptima fila con tu rey delante. El rey tiene que salir, pero la torre rival le da jaques por el lateral. Lleva primero tu torre a la cuarta fila y luego saca al rey: cuando lleguen los jaques, la torre los tapa, como un puente.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Lucena_position',
    primaryColor: 'white',
    playGoal: 'promotion',
  },
  {
    slug: 'vancura-position',
    name: { en: 'Vančura Position', es: 'Posición de Vančura' },
    initialFen: 'R7/6k1/P4r2/8/2K5/8/8/8 w - - 0 1',
    moves: [
      {
        san: 'Kb5',
        explanation: {
          en: "White's king heads toward the pawn to protect it, so the rook can get free.",
          es: 'El rey blanco se dirige hacia el peón para protegerlo y liberar así a la torre.',
        },
      },
      {
        san: 'Rf5+',
        explanation: {
          en: 'Black checks from the side straight away.',
          es: 'Las negras dan jaque por el lateral enseguida.',
        },
      },
      {
        san: 'Kc6',
        explanation: {
          en: 'The king keeps trying to get closer.',
          es: 'El rey sigue intentando acercarse.',
        },
      },
      {
        san: 'Rf6+',
        explanation: {
          en: 'Another check. The king can never shelter from these checks.',
          es: 'Otro jaque. El rey nunca puede resguardarse de estos jaques.',
        },
      },
      {
        san: 'Kd5',
        explanation: {
          en: 'The king has to go back up the board.',
          es: 'El rey tiene que volver a subir por el tablero.',
        },
      },
      { san: 'Rf5+', explanation: { en: 'Still checking.', es: 'Siguen los jaques.' } },
      {
        san: 'Ke6',
        explanation: {
          en: 'The king tries the other way, toward the black rook.',
          es: 'El rey prueba por el otro lado, hacia la torre negra.',
        },
      },
      {
        san: 'Rf6+',
        explanation: {
          en: 'Black keeps checking from the side.',
          es: 'Las negras siguen dando jaque por el lateral.',
        },
      },
      { san: 'Ke5', explanation: { en: 'The king steps back.', es: 'El rey retrocede.' } },
      {
        san: 'Rb6',
        explanation: {
          en: 'With no more useful checks, the rook goes back to attacking the pawn from the side.',
          es: 'Sin más jaques útiles, la torre vuelve a atacar el peón por el lateral.',
        },
      },
      {
        san: 'Kd5',
        explanation: {
          en: 'The king turns back toward the pawn.',
          es: 'El rey vuelve hacia el peón.',
        },
      },
      {
        san: 'Rf6',
        explanation: {
          en: 'The rook steps away again, ready to check once the king gets close to the pawn.',
          es: 'La torre vuelve a alejarse, lista para dar jaque cuando el rey se acerque al peón.',
        },
      },
      {
        san: 'Kd4',
        explanation: { en: 'White tries another route.', es: 'Las blancas prueban otra ruta.' },
      },
      {
        san: 'Rb6',
        explanation: { en: 'Back to attacking the pawn.', es: 'De nuevo a atacar el peón.' },
      },
      {
        san: 'Kc5',
        explanation: { en: 'The king threatens the rook.', es: 'El rey amenaza a la torre.' },
      },
      {
        san: 'Rf6',
        explanation: {
          en: 'The rook simply goes back to the f-file.',
          es: 'La torre simplemente vuelve a la columna f.',
        },
      },
      {
        san: 'Ra7+',
        explanation: {
          en: 'White tries to drive the black king away from the corner.',
          es: 'Las blancas intentan alejar al rey negro de la esquina.',
        },
      },
      {
        san: 'Kg6',
        explanation: {
          en: 'The king steps aside, but only for a moment.',
          es: 'El rey se aparta, pero solo un momento.',
        },
      },
      {
        san: 'Ra8',
        explanation: {
          en: 'The rook has to go back in front of the pawn.',
          es: 'La torre tiene que volver delante del peón.',
        },
      },
      {
        san: 'Kg7',
        explanation: {
          en: 'Back where it started. White has made no progress: a draw.',
          es: 'De vuelta al principio. Las blancas no han avanzado nada: tablas.',
        },
      },
    ],
    summary: {
      en: "The Vančura position is how to draw against a rook pawn when your rook can't get in front of it or behind it. Attack the pawn from the side, from far away, so the enemy rook has to stay in front of the pawn to guard it. Keep your king near the other corner. If the white king walks over to protect the pawn, check it from the side; it has nowhere to hide.",
      es: 'La posición de Vančura es la forma de hacer tablas contra un peón de torre cuando tu torre no puede ponerse delante ni detrás de él. Ataca el peón por el lateral, desde lejos, para que la torre rival tenga que quedarse delante del peón protegiéndolo. Mantén tu rey cerca de la otra esquina. Si el rey blanco va a proteger el peón, dale jaque por el lateral: no tiene dónde esconderse.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Van%C4%8Dura_position',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'short-side-defense',
    name: { en: 'Short-Side Defense', es: 'Defensa por el lado corto' },
    initialFen: '4K3/4P1k1/8/8/8/8/r7/5R2 b - - 0 1',
    moves: [
      {
        san: 'Ra8+',
        explanation: {
          en: "Black's king is on the short side, so the rook is free to check from the long side, far from the pawn.",
          es: 'El rey negro está en el lado corto, así que la torre puede dar jaque libremente desde el lado largo, lejos del peón.',
        },
      },
      {
        san: 'Kd7',
        explanation: {
          en: 'The king leaves the promotion square to escape the checks.',
          es: 'El rey abandona la casilla de coronación para escapar de los jaques.',
        },
      },
      {
        san: 'Ra7+',
        explanation: {
          en: 'Checks from the side keep coming.',
          es: 'Los jaques por el lateral siguen llegando.',
        },
      },
      {
        san: 'Kd6',
        explanation: { en: 'The king moves down the board.', es: 'El rey baja por el tablero.' },
      },
      {
        san: 'Ra6+',
        explanation: {
          en: 'Still checking: the rook is far enough away that the king can never get close to it.',
          es: 'Sigue el jaque: la torre está tan lejos que el rey nunca puede acercarse a ella.',
        },
      },
      {
        san: 'Kd5',
        explanation: { en: 'The king moves down again.', es: 'El rey vuelve a bajar.' },
      },
      { san: 'Ra5+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      {
        san: 'Kc6',
        explanation: {
          en: 'The king tries to approach the rook.',
          es: 'El rey intenta acercarse a la torre.',
        },
      },
      { san: 'Ra6+', explanation: { en: 'Still checking.', es: 'Sigue dando jaque.' } },
      {
        san: 'Kb7',
        explanation: {
          en: 'The king attacks the rook, but now it is far from its pawn.',
          es: 'El rey ataca a la torre, pero ahora está lejos de su peón.',
        },
      },
      {
        san: 'Re6',
        explanation: {
          en: 'The rook escapes and attacks the pawn, which falls next move. A draw.',
          es: 'La torre escapa y ataca al peón, que cae en la siguiente jugada. Tablas.',
        },
      },
    ],
    summary: {
      en: "When you can't get your king in front of the pawn, the short-side defense still draws. Put your king on the short side of the pawn, the side with fewer files, and your rook on the long side, at least three files away from the pawn. From there the rook checks the king from the side until it has to leave the pawn, and then the rook wins the pawn.",
      es: 'Cuando no puedes poner tu rey delante del peón, la defensa por el lado corto todavía hace tablas. Pon tu rey en el lado corto del peón, el que tiene menos columnas, y tu torre en el lado largo, al menos a tres columnas del peón. Desde ahí la torre da jaque al rey por el lateral hasta que tiene que abandonar el peón, y entonces la torre lo gana.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Rook_and_pawn_versus_rook_endgame',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'saavedra-position',
    name: { en: 'Saavedra Position', es: 'Posición de Saavedra' },
    initialFen: '8/8/1KP5/3r4/8/8/8/k7 w - - 0 1',
    moves: [
      {
        san: 'c7',
        explanation: {
          en: 'The pawn is one step from promoting, and the rook seems unable to stop it.',
          es: 'El peón está a un paso de coronar, y la torre parece incapaz de impedirlo.',
        },
      },
      {
        san: 'Rd6+',
        explanation: { en: 'Black starts checking.', es: 'Las negras empiezan a dar jaques.' },
      },
      {
        san: 'Kb5',
        explanation: {
          en: 'The king moves down the board, away from the checks.',
          es: 'El rey baja por el tablero, huyendo de los jaques.',
        },
      },
      { san: 'Rd5+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      { san: 'Kb4', explanation: { en: 'Still moving down.', es: 'Sigue bajando.' } },
      { san: 'Rd4+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      { san: 'Kb3', explanation: { en: 'Still moving down.', es: 'Sigue bajando.' } },
      { san: 'Rd3+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      {
        san: 'Kc2',
        explanation: {
          en: 'The king attacks the rook and ends the checks.',
          es: 'El rey ataca a la torre y pone fin a los jaques.',
        },
      },
      {
        san: 'Rd4',
        explanation: {
          en: 'The trap: after a queen promotion, Rc4+ gives up the rook, and taking it leaves Black stalemated.',
          es: 'La trampa: tras coronar en dama, Tc4+ entrega la torre, y al capturarla las negras quedan ahogadas.',
        },
      },
      {
        san: 'c8=R',
        explanation: {
          en: 'Promoting to a rook avoids the stalemate and threatens Ra8 mate.',
          es: 'Coronar en torre evita el ahogado y amenaza Ta8 mate.',
        },
      },
      {
        san: 'Ra4',
        explanation: {
          en: 'The only way to stop the mate.',
          es: 'La única forma de parar el mate.',
        },
      },
      {
        san: 'Kb3',
        explanation: {
          en: 'Double threat: mate on c1, and the rook on a4 is attacked. Black loses the rook or gets mated.',
          es: 'Doble amenaza: mate en c1, y la torre de a4 está atacada. Las negras pierden la torre o reciben mate.',
        },
      },
    ],
    summary: {
      en: 'In the Saavedra position the obvious move draws. The black rook drives the white king down the board with checks, then sets a stalemate trap: if the pawn promotes to a queen, the rook gives itself up and Black is stalemated. Promoting to a rook instead avoids the stalemate and threatens a mate of its own, and Black loses the rook or gets mated.',
      es: 'En la posición de Saavedra la jugada obvia hace tablas. La torre negra hace bajar al rey blanco a base de jaques y luego tiende una trampa de ahogado: si el peón corona en dama, la torre se sacrifica y las negras quedan ahogadas. Coronar en torre evita el ahogado y amenaza un mate propio, y las negras pierden la torre o reciben mate.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Saavedra_position',
    primaryColor: 'white',
  },
  {
    slug: 'reti-study',
    name: { en: "Réti's Study", es: 'Estudio de Réti' },
    initialFen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1',
    moves: [
      {
        san: 'Kg7',
        explanation: {
          en: "The white king looks hopelessly far from Black's pawn. But it moves diagonally, chasing two goals at once.",
          es: 'El rey blanco parece desesperadamente lejos del peón negro. Pero avanza en diagonal, persiguiendo dos objetivos a la vez.',
        },
      },
      {
        san: 'h4',
        explanation: {
          en: 'Black races the pawn forward.',
          es: 'Las negras lanzan su peón a la carrera.',
        },
      },
      {
        san: 'Kf6',
        explanation: {
          en: "Still on the diagonal: closer to Black's pawn and closer to supporting its own pawn on c6.",
          es: 'Sigue en la diagonal: más cerca del peón negro y más cerca de apoyar a su propio peón de c6.',
        },
      },
      {
        san: 'Kb6',
        explanation: {
          en: "Black has to go after White's pawn, or it promotes.",
          es: 'Las negras tienen que ir a por el peón blanco, o corona.',
        },
      },
      {
        san: 'Ke5',
        explanation: {
          en: 'The double threat: if Black takes the pawn, the king catches the h-pawn; if Black pushes the h-pawn instead, the king goes to d6 to support its own pawn.',
          es: 'La doble amenaza: si las negras toman el peón, el rey alcanza al peón de h; si en cambio avanzan el peón de h, el rey va a d6 a apoyar a su propio peón.',
        },
      },
      {
        san: 'Kxc6',
        explanation: {
          en: 'Black takes the pawn, but it spent two moves doing it.',
          es: 'Las negras capturan el peón, pero les ha costado dos jugadas.',
        },
      },
      {
        san: 'Kf4',
        explanation: {
          en: 'Those two moves were enough: the king is now inside the pawn\'s "square" and catches it.',
          es: 'Esas dos jugadas han bastado: el rey ya está dentro del "cuadrado" del peón y lo alcanza.',
        },
      },
      {
        san: 'h3',
        explanation: {
          en: 'The pawn keeps running.',
          es: 'El peón sigue corriendo.',
        },
      },
      {
        san: 'Kg3',
        explanation: {
          en: 'The king catches up.',
          es: 'El rey le da alcance.',
        },
      },
      {
        san: 'h2',
        explanation: {
          en: 'One step from promoting.',
          es: 'A un paso de coronar.',
        },
      },
      {
        san: 'Kxh2',
        explanation: {
          en: 'The pawn falls. Only kings are left: a draw.',
          es: 'El peón cae. Solo quedan los reyes: tablas.',
        },
      },
    ],
    summary: {
      en: "Réti's 1921 study shows that a king can be faster than it looks. On a chessboard a diagonal walk takes as many moves as a straight one, so the white king can head for Black's pawn and its own pawn at the same time. Black has to spend moves taking White's pawn, and those moves let the king catch the black pawn.",
      es: 'El estudio de Réti de 1921 muestra que un rey puede ser más rápido de lo que parece. En el tablero, avanzar en diagonal cuesta las mismas jugadas que en línea recta, así que el rey blanco puede dirigirse a la vez hacia el peón negro y hacia su propio peón. Las negras tienen que gastar jugadas en capturar el peón blanco, y con ellas el rey alcanza al peón negro.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/R%C3%A9ti_endgame_study',
    primaryColor: 'white',
    playGoal: 'draw',
  },
  {
    slug: 'opposition',
    name: { en: 'The Opposition', es: 'La oposición' },
    initialFen: '2k5/8/8/8/1PK5/8/8/8 b - - 0 1',
    moves: [
      {
        san: 'Kb8',
        explanation: {
          en: 'The only move that draws: Black gets ready to answer every white king move with the opposition. Kb7? loses to Kb5.',
          es: 'La única jugada que hace tablas: las negras se preparan para responder a cada jugada del rey blanco con la oposición. Rb7? pierde por Rb5.',
        },
      },
      {
        san: 'Kc5',
        explanation: { en: 'The white king steps forward.', es: 'El rey blanco avanza.' },
      },
      {
        san: 'Kc7',
        explanation: {
          en: 'Black takes the opposition: the kings face each other and White has to move.',
          es: 'Las negras toman la oposición: los reyes quedan frente a frente y les toca mover a las blancas.',
        },
      },
      {
        san: 'Kb5',
        explanation: {
          en: 'White tries the other side.',
          es: 'Las blancas prueban por el otro lado.',
        },
      },
      {
        san: 'Kb7',
        explanation: {
          en: 'Opposition again. The white king never reaches a6, b6 or c6.',
          es: 'Oposición de nuevo. El rey blanco nunca llega a a6, b6 ni c6.',
        },
      },
      {
        san: 'Ka5',
        explanation: { en: 'White tries the edge.', es: 'Las blancas prueban por el borde.' },
      },
      {
        san: 'Ka7',
        explanation: {
          en: 'And Black answers with the opposition once more. A draw.',
          es: 'Y las negras responden con la oposición una vez más. Tablas.',
        },
      },
    ],
    summary: {
      en: 'Two kings facing each other with one square between them are in opposition, and the side that doesn\'t have to move "has the opposition." In king and pawn endings the defender uses it to keep the attacking king off the key squares in front of the pawn. This line is from Gligorić–Fischer, 1959, where Black held the draw by always taking the opposition.',
      es: 'Dos reyes enfrentados con una casilla entre ellos están en oposición, y el bando al que no le toca mover "tiene la oposición". En los finales de rey y peón, el defensor la usa para impedir que el rey atacante llegue a las casillas clave delante del peón. Esta línea es de Gligorić–Fischer, 1959, donde las negras hicieron tablas tomando siempre la oposición.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Opposition_(chess)',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'triangulation',
    name: { en: 'Triangulation', es: 'Triangulación' },
    initialFen: '8/1p1k4/1P6/2PK4/8/8/8/8 w - - 0 1',
    moves: [
      {
        san: 'Ke5',
        explanation: {
          en: 'White wants this exact position with Black to move, so the king starts its triangle: d5, e5, d4, back to d5.',
          es: 'Las blancas quieren esta misma posición con el turno de las negras, así que el rey empieza su triángulo: d5, e5, d4 y de vuelta a d5.',
        },
      },
      {
        san: 'Kc6',
        explanation: {
          en: 'Black tries to win the pawn on c5, which is defended by its partner on b6.',
          es: 'Las negras intentan ganar el peón de c5, que está defendido por su compañero de b6.',
        },
      },
      {
        san: 'Kd4',
        explanation: {
          en: 'The second corner of the triangle, guarding c5.',
          es: 'La segunda esquina del triángulo, defendiendo c5.',
        },
      },
      {
        san: 'Kd7',
        explanation: {
          en: 'Black has to come back to guard against the king entering.',
          es: 'Las negras tienen que volver para vigilar la entrada del rey.',
        },
      },
      {
        san: 'Kd5',
        explanation: {
          en: 'Back to the start, but now it is Black to move: zugzwang.',
          es: 'De vuelta al principio, pero ahora mueven las negras: zugzwang.',
        },
      },
      {
        san: 'Kc8',
        explanation: {
          en: 'Any king move lets the white king in.',
          es: 'Cualquier jugada del rey deja pasar al rey blanco.',
        },
      },
      { san: 'Ke6', explanation: { en: 'The king walks in.', es: 'El rey entra.' } },
      {
        san: 'Kd8',
        explanation: {
          en: 'Black tries to stay close.',
          es: 'Las negras intentan mantenerse cerca.',
        },
      },
      {
        san: 'Kd6',
        explanation: { en: 'The king keeps advancing.', es: 'El rey sigue avanzando.' },
      },
      {
        san: 'Kc8',
        explanation: {
          en: 'Black is running out of room.',
          es: 'Las negras se quedan sin espacio.',
        },
      },
      {
        san: 'Ke7',
        explanation: {
          en: 'The king heads for the pawn on b7.',
          es: 'El rey se dirige al peón de b7.',
        },
      },
      {
        san: 'Kb8',
        explanation: { en: 'Black defends the pawn.', es: 'Las negras defienden el peón.' },
      },
      {
        san: 'Kd7',
        explanation: { en: 'The king takes away c8 and c7.', es: 'El rey le quita c8 y c7.' },
      },
      { san: 'Ka8', explanation: { en: 'Pushed into the corner.', es: 'Empujado a la esquina.' } },
      {
        san: 'c6',
        explanation: {
          en: 'The c-pawn breaks through and White wins.',
          es: 'El peón de c rompe y las blancas ganan.',
        },
      },
    ],
    summary: {
      en: "Sometimes the position would be winning if only the other side had to move. Triangulation fixes that: the king walks around a small triangle of squares and comes back to where it started, taking three moves to do it. The defending king can't copy it, because it has to keep guarding its squares, so the same position comes back with the other side to move.",
      es: 'A veces la posición estaría ganada si solo le tocara mover al rival. La triangulación lo arregla: el rey recorre un pequeño triángulo de casillas y vuelve a donde estaba, gastando tres jugadas. El rey defensor no puede imitarlo porque tiene que seguir vigilando sus casillas, así que vuelve a aparecer la misma posición con el turno del rival.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Triangulation_(chess)',
    primaryColor: 'white',
    playGoal: 'promotion',
  },
  {
    slug: 'wrong-rook-pawn',
    name: { en: 'Wrong Bishop and Rook Pawn', es: 'Alfil equivocado y peón de torre' },
    // The source gives the position only; this short line ends in the stalemate it describes.
    initialFen: 'k7/4B3/PK6/8/8/8/8/8 w - - 0 1',
    moves: [
      {
        san: 'Bc5',
        explanation: {
          en: "White's bishop moves on the dark squares, but the promotion square a8 is light.",
          es: 'El alfil blanco va por casillas oscuras, pero la casilla de coronación a8 es clara.',
        },
      },
      {
        san: 'Kb8',
        explanation: {
          en: 'The king steps out of the corner, since nothing attacks b8.',
          es: 'El rey sale de la esquina, ya que nada ataca b8.',
        },
      },
      {
        san: 'Bd6+',
        explanation: {
          en: 'The bishop checks the king back into the corner.',
          es: 'El alfil da jaque y devuelve al rey a la esquina.',
        },
      },
      {
        san: 'Ka8',
        explanation: {
          en: 'Back in the corner, and the bishop can never attack a8.',
          es: 'De vuelta en la esquina, y el alfil nunca podrá atacar a8.',
        },
      },
      {
        san: 'a7',
        explanation: {
          en: 'Pushing the pawn leaves Black with no legal move: stalemate, a draw.',
          es: 'Avanzar el peón deja a las negras sin ninguna jugada legal: ahogado, tablas.',
        },
      },
    ],
    summary: {
      en: "A bishop and a rook pawn can't win if the bishop doesn't control the pawn's promotion square. The defending king stays in that corner, and nothing can drive it out: the bishop can't attack the square, and pushing it away with the king only leads to stalemate. Even a whole bishop up, it's a draw.",
      es: 'Un alfil y un peón de torre no pueden ganar si el alfil no controla la casilla de coronación del peón. El rey defensor se queda en esa esquina y nada puede sacarlo: el alfil no puede atacar la casilla, e intentar echarlo con el rey solo lleva al ahogado. Incluso con un alfil de más, son tablas.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Wrong_rook_pawn',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'queen-vs-pawn-win',
    name: { en: 'Queen vs. Pawn on the Seventh', es: 'Dama contra peón en séptima' },
    initialFen: '3Q4/1K6/8/8/8/8/3kp3/8 b - - 0 1',
    moves: [
      {
        san: 'Ke3',
        explanation: {
          en: 'The black king supports its pawn, which is about to promote.',
          es: 'El rey negro apoya a su peón, que está a punto de coronar.',
        },
      },
      {
        san: 'Qh4',
        explanation: {
          en: 'The queen covers e1 along the diagonal, so the pawn cannot promote yet.',
          es: 'La dama controla e1 por la diagonal, así que el peón aún no puede coronar.',
        },
      },
      {
        san: 'Kd2',
        explanation: { en: 'The king guards e1 as well.', es: 'El rey también vigila e1.' },
      },
      {
        san: 'Qd4+',
        explanation: { en: 'Checks bring the queen closer.', es: 'Los jaques acercan la dama.' },
      },
      {
        san: 'Kc2',
        explanation: {
          en: 'The king steps away but keeps guarding the pawn.',
          es: 'El rey se aparta pero sigue protegiendo el peón.',
        },
      },
      {
        san: 'Qe3',
        explanation: {
          en: 'The queen attacks the pawn and covers e1.',
          es: 'La dama ataca el peón y controla e1.',
        },
      },
      {
        san: 'Kd1',
        explanation: {
          en: 'The king defends the pawn again.',
          es: 'El rey vuelve a defender el peón.',
        },
      },
      { san: 'Qd3+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      {
        san: 'Ke1',
        explanation: {
          en: 'The king ends up in front of its own pawn, blocking it.',
          es: 'El rey acaba delante de su propio peón, bloqueándolo.',
        },
      },
      {
        san: 'Kc6',
        explanation: {
          en: 'The pawn is blocked, so White has a free move: the king steps closer.',
          es: 'El peón está bloqueado, así que las blancas tienen una jugada libre: el rey se acerca.',
        },
      },
      {
        san: 'Kf2',
        explanation: {
          en: 'The king steps out again, so the pawn can promote.',
          es: 'El rey vuelve a salir para que el peón pueda coronar.',
        },
      },
      {
        san: 'Qd2',
        explanation: {
          en: 'The queen attacks the pawn and covers e1.',
          es: 'La dama ataca el peón y controla e1.',
        },
      },
      {
        san: 'Kf1',
        explanation: {
          en: 'The king keeps defending the pawn.',
          es: 'El rey sigue defendiendo el peón.',
        },
      },
      { san: 'Qf4+', explanation: { en: 'The checks start again.', es: 'Vuelven los jaques.' } },
      {
        san: 'Kg1',
        explanation: {
          en: 'The king escapes toward the corner.',
          es: 'El rey escapa hacia la esquina.',
        },
      },
      { san: 'Qe3+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      {
        san: 'Kf1',
        explanation: { en: 'The king goes back to the pawn.', es: 'El rey vuelve junto al peón.' },
      },
      { san: 'Qf3+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      {
        san: 'Ke1',
        explanation: { en: 'In front of the pawn again.', es: 'Otra vez delante del peón.' },
      },
      {
        san: 'Kd5',
        explanation: {
          en: 'Another free move for the white king.',
          es: 'Otra jugada libre para el rey blanco.',
        },
      },
      {
        san: 'Kd2',
        explanation: {
          en: 'The king steps out of the way again.',
          es: 'El rey vuelve a apartarse.',
        },
      },
      {
        san: 'Qf2',
        explanation: {
          en: 'The queen attacks e2 and covers e1.',
          es: 'La dama ataca e2 y controla e1.',
        },
      },
      {
        san: 'Kd1',
        explanation: { en: 'The king keeps defending.', es: 'El rey sigue defendiendo.' },
      },
      {
        san: 'Qd4+',
        explanation: { en: 'The same pattern again.', es: 'El mismo esquema otra vez.' },
      },
      { san: 'Kc2', explanation: { en: 'The king steps aside.', es: 'El rey se aparta.' } },
      {
        san: 'Qe3',
        explanation: {
          en: 'Attacking the pawn and covering e1.',
          es: 'Ataca el peón y controla e1.',
        },
      },
      { san: 'Kd1', explanation: { en: 'Defending the pawn.', es: 'Defiende el peón.' } },
      { san: 'Qd3+', explanation: { en: 'A check.', es: 'Un jaque.' } },
      {
        san: 'Ke1',
        explanation: { en: 'In front of the pawn once more.', es: 'Delante del peón una vez más.' },
      },
      {
        san: 'Ke4',
        explanation: {
          en: 'A third free move: the king is almost there.',
          es: 'Una tercera jugada libre: el rey casi ha llegado.',
        },
      },
      {
        san: 'Kf2',
        explanation: { en: 'The king steps out again.', es: 'El rey vuelve a salir.' },
      },
      { san: 'Qf3+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      {
        san: 'Ke1',
        explanation: {
          en: 'The only way to keep the pawn.',
          es: 'La única forma de conservar el peón.',
        },
      },
      {
        san: 'Kd3',
        explanation: {
          en: 'The king has arrived: the pawn falls, and mate follows.',
          es: 'El rey ha llegado: el peón cae y luego llega el mate.',
        },
      },
    ],
    summary: {
      en: 'A queen beats a center or knight pawn on its seventh rank, even with the white king far away. Check the king, or attack the pawn, until the black king has to step in front of its own pawn. While it blocks the pawn, White has a free move to bring the king one step closer. Repeat until the king arrives, then win the pawn and mate.',
      es: 'Una dama gana contra un peón central o de caballo en su séptima fila, aunque el rey blanco esté lejos. Da jaque al rey o ataca el peón hasta que el rey negro tenga que ponerse delante de su propio peón. Mientras lo bloquea, las blancas tienen una jugada libre para acercar su rey un paso. Se repite hasta que llega el rey, y entonces se gana el peón y se da mate.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Queen_versus_pawn_endgame',
    primaryColor: 'white',
  },
  {
    slug: 'queen-vs-bishop-pawn',
    name: { en: 'Queen vs. Bishop Pawn', es: 'Dama contra peón de alfil' },
    initialFen: '3Q4/8/8/8/4K3/8/1kp5/8 w - - 0 1',
    moves: [
      {
        san: 'Qb6+',
        explanation: {
          en: 'White starts the usual checks.',
          es: 'Las blancas empiezan los jaques de siempre.',
        },
      },
      {
        san: 'Ka1',
        explanation: {
          en: 'The key defense: the king goes to the corner instead of in front of the pawn.',
          es: 'La defensa clave: el rey va a la esquina en lugar de ponerse delante del peón.',
        },
      },
      { san: 'Qd4+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      {
        san: 'Kb1',
        explanation: {
          en: 'The king comes back next to the pawn.',
          es: 'El rey vuelve junto al peón.',
        },
      },
      { san: 'Qb4+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      { san: 'Ka1', explanation: { en: 'Back to the corner.', es: 'De vuelta a la esquina.' } },
      {
        san: 'Qc3+',
        explanation: { en: 'White keeps checking.', es: 'Las blancas siguen dando jaque.' },
      },
      { san: 'Kb1', explanation: { en: 'Next to the pawn again.', es: 'Otra vez junto al peón.' } },
      { san: 'Qb3+', explanation: { en: 'One more check.', es: 'Un jaque más.' } },
      {
        san: 'Ka1',
        explanation: {
          en: 'Into the corner. Taking the pawn now would be stalemate, and White has no time to bring the king. A draw.',
          es: 'A la esquina. Capturar ahora el peón sería ahogado, y las blancas no tienen tiempo de acercar el rey. Tablas.',
        },
      },
    ],
    summary: {
      en: "Against a bishop pawn (or rook pawn) on the seventh, a lone queen usually can't win. The defending king runs to the corner, and when White forces it in front of the pawn, taking the pawn would leave Black stalemated. White only wins if its king is already close enough to help.",
      es: 'Contra un peón de alfil (o de torre) en séptima, una dama sola normalmente no puede ganar. El rey defensor corre a la esquina, y cuando las blancas lo obligan a ponerse delante del peón, capturar el peón dejaría a las negras ahogadas. Las blancas solo ganan si su rey ya está lo bastante cerca para ayudar.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Queen_versus_pawn_endgame',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'trebuchet',
    name: { en: 'Trébuchet (Mutual Zugzwang)', es: 'Trébuchet (zugzwang recíproco)' },
    // The source gives the position only; this line stops once White wins the pawn.
    initialFen: '8/8/8/3pK3/2kP4/8/8/8 b - - 0 1',
    moves: [
      {
        san: 'Kb4',
        explanation: {
          en: 'Black has to move, and every king move leaves the d5-pawn undefended.',
          es: 'Las negras tienen que mover, y cualquier jugada del rey deja sin defensa al peón de d5.',
        },
      },
      {
        san: 'Kxd5',
        explanation: {
          en: 'White wins the pawn and its king stands right in front of its own pawn, which will promote.',
          es: 'Las blancas ganan el peón y su rey queda justo delante de su propio peón, que coronará.',
        },
      },
    ],
    summary: {
      en: "In a trébuchet each king attacks the other's pawn while defending its own. Whoever has to move must leave their pawn behind: the other king takes it and then escorts its own pawn to promotion. Here it's Black to move, so Black loses.",
      es: 'En un trébuchet cada rey ataca el peón rival mientras defiende el suyo. Al bando al que le toca mover tiene que abandonar su peón: el otro rey lo captura y luego acompaña a su propio peón hasta la coronación. Aquí mueven las negras, así que pierden.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Zugzwang',
    primaryColor: 'white',
    playGoal: 'promotion',
  },
  {
    slug: 'key-squares',
    name: { en: 'Key Squares', es: 'Casillas clave' },
    initialFen: '5k2/8/8/8/8/2P5/8/3K4 w - - 0 1',
    moves: [
      {
        san: 'Kc2',
        explanation: {
          en: 'The king heads for the key squares b5, c5 and d5. The direct Kd2 lets Black block it by taking the opposition, so White goes around the other side of the pawn.',
          es: 'El rey se dirige a las casillas clave b5, c5 y d5. El directo Rd2 permite a las negras bloquearlo tomando la oposición, así que las blancas rodean el peón por el otro lado.',
        },
      },
      {
        san: 'Ke7',
        explanation: { en: 'Black rushes to defend them.', es: 'Las negras corren a defenderlas.' },
      },
      {
        san: 'Kb3',
        explanation: { en: 'Toward b5, around the pawn.', es: 'Hacia b5, rodeando el peón.' },
      },
      { san: 'Kd6', explanation: { en: 'Black gets closer.', es: 'Las negras se acercan.' } },
      { san: 'Kb4', explanation: { en: 'One step from b5.', es: 'A un paso de b5.' } },
      { san: 'Kc6', explanation: { en: 'Black takes b5 away.', es: 'Las negras le quitan b5.' } },
      {
        san: 'Kc4',
        explanation: { en: 'Now c5 and d5 are in reach.', es: 'Ahora c5 y d5 están a su alcance.' },
      },
      {
        san: 'Kd6',
        explanation: {
          en: 'If Black guards one, White takes another.',
          es: 'Si las negras vigilan una, las blancas toman otra.',
        },
      },
      {
        san: 'Kb5',
        explanation: {
          en: 'A key square: the pawn now promotes whatever Black does.',
          es: 'Una casilla clave: ahora el peón corona haga lo que haga las negras.',
        },
      },
    ],
    summary: {
      en: 'In king and pawn against king, the attacker wins if its king reaches a key square: for a pawn on its second, third or fourth rank, the three squares two ranks in front of it. Here the key squares are b5, c5 and d5, and the white king can reach one of them by any route, however far away the black king starts.',
      es: 'En rey y peón contra rey, el atacante gana si su rey llega a una casilla clave: para un peón en su segunda, tercera o cuarta fila, las tres casillas dos filas por delante. Aquí las casillas clave son b5, c5 y d5, y el rey blanco puede llegar a una de ellas por cualquier camino, empiece donde empiece el rey negro.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/King_and_pawn_versus_king_endgame',
    primaryColor: 'white',
    playGoal: 'promotion',
  },
  {
    slug: 'rule-of-the-square',
    name: { en: 'Rule of the Square', es: 'La regla del cuadrado' },
    // The source shows the position and Kb4; the rest of the line is ours.
    initialFen: '8/8/8/8/5P2/k7/8/K7 b - - 0 1',
    moves: [
      {
        san: 'Kb4',
        explanation: {
          en: 'The square runs from f4 to b8. Kb4 steps inside it, so the king catches the pawn.',
          es: 'El cuadrado va de f4 a b8. Rb4 entra en él, así que el rey alcanza al peón.',
        },
      },
      { san: 'f5', explanation: { en: 'The pawn runs.', es: 'El peón corre.' } },
      {
        san: 'Kc5',
        explanation: {
          en: 'The king stays inside the shrinking square.',
          es: 'El rey se mantiene dentro del cuadrado, que se va encogiendo.',
        },
      },
      { san: 'f6', explanation: { en: 'Still running.', es: 'Sigue corriendo.' } },
      { san: 'Kd6', explanation: { en: 'Still inside.', es: 'Todavía dentro.' } },
      { san: 'f7', explanation: { en: 'One step from promoting.', es: 'A un paso de coronar.' } },
      {
        san: 'Ke7',
        explanation: { en: 'The king reaches the pawn.', es: 'El rey llega al peón.' },
      },
      {
        san: 'f8=Q+',
        explanation: {
          en: 'The pawn promotes, but the new queen is lost at once.',
          es: 'El peón corona, pero la nueva dama se pierde al instante.',
        },
      },
      {
        san: 'Kxf8',
        explanation: { en: 'Only kings are left: a draw.', es: 'Solo quedan los reyes: tablas.' },
      },
    ],
    summary: {
      en: 'Can a king catch a passed pawn on its own? Draw a square from the pawn to its promotion rank: if the king can step inside the square, it catches the pawn; if not, the pawn promotes. Here Black is to move and steps into the square at once.',
      es: '¿Puede un rey alcanzar por sí solo a un peón pasado? Dibuja un cuadrado desde el peón hasta su fila de coronación: si el rey puede entrar en el cuadrado, alcanza al peón; si no, el peón corona. Aquí mueven las negras y entran en el cuadrado enseguida.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/King_and_pawn_versus_king_endgame',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'rook-pawn-draw',
    name: { en: 'Rook Pawn Draw', es: 'Tablas con peón de torre' },
    initialFen: 'k7/8/K7/P7/8/8/8/8 w - - 0 1',
    moves: [
      {
        san: 'Kb6',
        explanation: { en: 'White tries to go around.', es: 'Las blancas intentan rodearlo.' },
      },
      {
        san: 'Kb8',
        explanation: {
          en: 'The black king just stays near the corner.',
          es: 'El rey negro simplemente se queda cerca de la esquina.',
        },
      },
      { san: 'a6', explanation: { en: 'Push the pawn.', es: 'Avanza el peón.' } },
      { san: 'Ka8', explanation: { en: 'Back to the corner.', es: 'De vuelta a la esquina.' } },
      {
        san: 'a7',
        explanation: {
          en: 'Black has no legal move: stalemate, a draw.',
          es: 'Las negras no tienen jugadas legales: ahogado, tablas.',
        },
      },
    ],
    summary: {
      en: "A rook pawn is the exception to the king and pawn rules. Once the defending king reaches the corner in front of the pawn, nothing can drive it out: the attacking king can't get around the side, and pushing the pawn only ends in stalemate.",
      es: 'Un peón de torre es la excepción a las reglas de rey y peón. En cuanto el rey defensor llega a la esquina delante del peón, nada puede sacarlo: el rey atacante no puede rodearlo por el lado, y avanzar el peón solo termina en ahogado.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/King_and_pawn_versus_king_endgame',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'queen-vs-rook',
    name: { en: 'Queen vs. Rook (Philidor)', es: 'Dama contra Torre (Philidor)' },
    // The source's White-to-move triangulation, then its Black-to-move line.
    initialFen: '1k6/1r6/2K5/Q7/8/8/8/8 w - - 0 1',
    moves: [
      {
        san: 'Qe5+',
        explanation: {
          en: 'White would like Black to be the one to move, so the queen triangulates.',
          es: 'Las blancas quieren que les toque mover a las negras, así que la dama triangula.',
        },
      },
      {
        san: 'Ka8',
        explanation: {
          en: 'The king hides in the corner.',
          es: 'El rey se esconde en la esquina.',
        },
      },
      {
        san: 'Qa1+',
        explanation: {
          en: 'The second corner of the triangle.',
          es: 'La segunda esquina del triángulo.',
        },
      },
      { san: 'Kb8', explanation: { en: 'Back to b8.', es: 'De vuelta a b8.' } },
      {
        san: 'Qa5',
        explanation: {
          en: 'The same position as at the start, but now Black has to move: zugzwang.',
          es: 'La misma posición del principio, pero ahora mueven las negras: zugzwang.',
        },
      },
      {
        san: 'Rb1',
        explanation: {
          en: "The rook has to leave the king's side.",
          es: 'La torre tiene que separarse del rey.',
        },
      },
      { san: 'Qd8+', explanation: { en: 'Checks start.', es: 'Empiezan los jaques.' } },
      { san: 'Ka7', explanation: { en: 'The only square.', es: 'La única casilla.' } },
      { san: 'Qd4+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      { san: 'Ka8', explanation: { en: 'Back to the corner.', es: 'De vuelta a la esquina.' } },
      { san: 'Qh8+', explanation: { en: 'Another check.', es: 'Otro jaque.' } },
      { san: 'Ka7', explanation: { en: 'Forced.', es: 'Forzada.' } },
      {
        san: 'Qh7+',
        explanation: {
          en: 'A fork: check, and the rook on b1 falls next move.',
          es: 'Una horquilla: jaque, y la torre de b1 cae en la siguiente jugada.',
        },
      },
    ],
    summary: {
      en: "Queen against rook is a win, and Philidor's 1777 position shows how. With Black to move, any rook move lets the queen fork king and rook with checks. With White to move, the queen loses a move by triangulating and hands the move to Black.",
      es: 'Dama contra torre es una victoria, y la posición de Philidor de 1777 muestra cómo. Si mueven las negras, cualquier jugada de torre permite a la dama hacer una horquilla a rey y torre con jaques. Si mueven las blancas, la dama pierde un tiempo triangulando y le pasa el turno a las negras.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Pawnless_chess_endgame',
    primaryColor: 'white',
  },
  {
    slug: 'opposite-colored-bishops',
    name: { en: 'Opposite-Colored Bishops', es: 'Alfiles de distinto color' },
    initialFen: '8/2bB4/2P5/6k1/4K3/5P2/8/8 w - - 0 1',
    moves: [
      {
        san: 'Kd5',
        explanation: {
          en: 'The white king heads for the queenside to support the c-pawn.',
          es: 'El rey blanco se dirige al flanco de dama para apoyar el peón de c.',
        },
      },
      {
        san: 'Kf6',
        explanation: {
          en: 'The key move: the black king goes after the other pawn, so the white king never gets to e6.',
          es: 'La jugada clave: el rey negro va a por el otro peón, así que el rey blanco nunca llega a e6.',
        },
      },
      {
        san: 'Kc5',
        explanation: {
          en: 'White keeps trying on the queenside.',
          es: 'Las blancas siguen intentándolo en el flanco de dama.',
        },
      },
      {
        san: 'Ke7',
        explanation: {
          en: "The king gets in front of the c-pawn's path.",
          es: 'El rey se pone en el camino del peón de c.',
        },
      },
      { san: 'Kb5', explanation: { en: 'White heads for b6.', es: 'Las blancas van hacia b6.' } },
      {
        san: 'Bf4',
        explanation: {
          en: "The bishop waits on a dark diagonal: White's light-squared bishop can't drive it away.",
          es: 'El alfil espera en una diagonal oscura: el alfil de casillas claras de las blancas no puede echarlo.',
        },
      },
      { san: 'Kb6', explanation: { en: 'The king reaches b6.', es: 'El rey llega a b6.' } },
      {
        san: 'Kd8',
        explanation: {
          en: "And the black king covers c7 and c8. White can't make progress: a draw.",
          es: 'Y el rey negro cubre c7 y c8. Las blancas no pueden avanzar: tablas.',
        },
      },
    ],
    summary: {
      en: "With bishops of opposite colors, even two pawns up is often a draw. The defending bishop guards the dark squares the attacker's pawns have to cross, and the attacker's bishop can never challenge it. Here the black king and bishop stop both pawns on the same diagonal.",
      es: 'Con alfiles de distinto color, incluso dos peones de más suelen ser tablas. El alfil defensor vigila las casillas oscuras que los peones atacantes tienen que cruzar, y el alfil atacante nunca puede disputárselas. Aquí el rey y el alfil negros detienen ambos peones en la misma diagonal.',
    },
    sourceUrl: 'https://en.wikipedia.org/wiki/Opposite-colored_bishops_endgame',
    primaryColor: 'black',
    playGoal: 'draw',
  },
  {
    slug: 'cutting-off-the-king',
    name: { en: 'Cutting Off the King', es: 'Cortar al rey' },
    initialFen: '3r4/8/4K3/3P4/7R/4k3/8/8 w - - 0 1',
    moves: [
      {
        san: 'd6',
        explanation: {
          en: "White's rook on the fourth rank keeps the black king away, so the pawn simply advances.",
          es: 'La torre blanca en la cuarta fila mantiene alejado al rey negro, así que el peón simplemente avanza.',
        },
      },
      {
        san: 'Re8+',
        explanation: {
          en: 'The rook checks to slow things down.',
          es: 'La torre da jaque para ganar tiempo.',
        },
      },
      {
        san: 'Kd7',
        explanation: {
          en: 'The king walks forward, attacking the rook.',
          es: 'El rey avanza, atacando a la torre.',
        },
      },
      { san: 'Rg8', explanation: { en: 'The rook steps away.', es: 'La torre se aparta.' } },
      {
        san: 'Kc7',
        explanation: {
          en: 'The king steps aside so the pawn can advance.',
          es: 'El rey se aparta para que el peón pueda avanzar.',
        },
      },
      { san: 'Rg7+', explanation: { en: 'One more check.', es: 'Un jaque más.' } },
      {
        san: 'd7',
        explanation: {
          en: "The pawn blocks the check and will promote: Black's king is too far away to help.",
          es: 'El peón tapa el jaque y coronará: el rey negro está demasiado lejos para ayudar.',
        },
      },
    ],
    summary: {
      en: "In rook and pawn against rook, if the defending king is cut off from the pawn by the attacking rook, the pawn usually promotes. The rook builds a wall along a rank or file, the defending king can't cross it, and the rook alone can't stop the pawn and king together.",
      es: 'En torre y peón contra torre, si la torre atacante corta al rey defensor separándolo del peón, el peón normalmente corona. La torre levanta un muro por una fila o columna, el rey defensor no puede cruzarlo y la torre sola no puede detener al peón y al rey juntos.',
    },
    sourceUrl: 'https://en.wikibooks.org/wiki/Chess/The_Endgame/Rook_and_Pawn_Endings',
    primaryColor: 'white',
    playGoal: 'promotion',
  },
]

export function getPositionLesson(slug: string): Lesson | undefined {
  return POSITION_LESSONS.find((lesson) => lesson.slug === slug)
}
