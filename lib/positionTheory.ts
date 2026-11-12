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
  },
]

export function getPositionLesson(slug: string): Lesson | undefined {
  return POSITION_LESSONS.find((lesson) => lesson.slug === slug)
}
