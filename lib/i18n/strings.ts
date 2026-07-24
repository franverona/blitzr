import { getLocale, Locale } from './locale'

// UI string dictionary — plain data, no templating engine. Parameterized/
// pluralized text is a function value instead of a placeholder syntax; `es`
// is typed against `typeof en` (via `Strings` below) so a missing or
// mismatched translation is a compile error, not a silent gap.
//
// This only covers static UI text. The tactical-description generators in
// lib/ (describeMove, describeBetterMove, describeBlunderReason, etc.) and
// the /learn lesson content (lib/openingTheory.ts) are translated
// separately — see each file's own locale handling.

const en = {
  common: {
    close: 'Close',
    vs: 'vs',
    betterWas: 'Better was',
    color: { white: 'White', black: 'Black' },
    result: { win: 'Win', draw: 'Draw', loss: 'Loss' },
    timeClass: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', daily: 'Daily' },
    pawns: (n: number) => `${n.toFixed(1)} pawns`,
  },
  nav: {
    games: 'Games',
    openings: 'Openings',
    learn: 'Learn',
    repertoire: 'Repertoire',
    drill: 'Drill',
    blunders: 'Blunders',
  },
  gameRow: {
    timeClassTooltips: {
      bullet: 'Bullet — under 3 minutes per player',
      blitz: 'Blitz — 3 to 10 minutes per player',
      rapid: 'Rapid — 10 to 30 minutes per player',
      daily: 'Daily — correspondence chess, days per move rather than a running clock',
    } as Record<string, string>,
  },
  blunderBadge: {
    labels: { mistake: 'Mistake', blunder: 'Blunder' },
    titles: {
      mistake: 'A blunder of 2–4 pawns of swing — the smaller of the two severities',
      blunder: 'A blunder of 4+ pawns of swing — the more severe of the two severities',
    },
  },
  drillFilters: {
    all: 'All',
    deviations: 'Deviations',
    deviationsTitle: 'Cards for games where you left your own prepared repertoire moves',
    blunders: 'Blunders',
    blundersTitle:
      'Cards for your own moves that lost at least 2 pawns of advantage, found by Stockfish',
    allOpenings: 'All openings',
  },
  gameList: {
    empty: 'No games synced yet. Click "Sync games" to fetch your Chess.com history.',
    headers: {
      date: 'Date',
      color: 'Color',
      opponent: 'Opponent',
      result: 'Result',
      opening: 'Opening',
      timeClass: 'Time class',
    },
  },
  openingsTable: {
    empty: 'No games synced yet. Sync games from the Games page to see your opening stats.',
    headers: {
      opening: 'Opening',
      eco: 'ECO',
      games: 'Games',
      wdl: 'W / D / L',
      asWhite: 'As White',
      asBlack: 'As Black',
    },
  },
  blunderStats: {
    emptyNoAnalyzed:
      'No analyzed games yet — open a game and click "Analyze with Stockfish" to start building this up.',
    emptyNoBlunders: (n: number) =>
      `No blunders found across your ${n} analyzed ${n === 1 ? 'game' : 'games'} — clean sheet so far.`,
    byOpening: 'By opening',
    byPiece: 'By piece',
    worstBlunders: 'Worst blunders',
    avgSwing: 'Avg swing',
    avgSwingTooltip: 'How many pawns worse the position got, on average, across these blunders',
  },
  evalHelp: {
    summary: 'How to read this',
    entries: [
      {
        term: '22… a6',
        body: "— move 22, played by Black. A plain number (22.) is White's move; the ellipsis (22…) marks Black's reply to it.",
      },
      {
        term: '+1.4 / -0.8',
        body: '— how far ahead White (positive) or Black (negative) is, in a "pawns of advantage" unit. It blends material and position into one number, so +1.4 doesn\'t mean a literal extra pawn — just an edge worth about that much.',
      },
      {
        term: 'M7 / -M3',
        body: '— a forced checkmate in that many moves, found no matter how the other side responds. Once mate is found, the pawn number stops applying entirely.',
      },
      {
        term: 'Blunder',
        body: 'A move that made the position at least 2 pawns worse than the best available move, for whoever just played it. This is relative to the best move, not to whether that side was already ahead or behind — a losing position can still get worse, and that still counts.',
      },
      {
        term: 'Mistake / Blunder',
        body: 'Two severities within what already counts as a blunder above: under 4 pawns worse is labeled Mistake, 4 pawns or worse is labeled Blunder. Both still count as "a blunder" everywhere else in the app (drilling, the totals above) — this is just a finer read on how bad it was.',
      },
      {
        term: 'Swing',
        body: 'How many pawns worse a move made the position for whoever played it. "Avg swing" averages that across a group of blunders — a way to see whether a category tends to be near-misses or outright disasters.',
      },
      {
        term: 'Better was …',
        body: "What Stockfish would have played instead, from the position right before the blunder. The same suggestion is drawn as a yellow arrow on the board at whichever position you're currently viewing.",
      },
    ],
  },
  board: {
    navLabels: { start: 'Start', previous: 'Previous move', next: 'Next move', end: 'End' },
    startingPositionButton: 'Starting position',
    material: 'Material:',
  },
  moveExplanation: {
    startingPosition: 'Starting position.',
  },
  flipBoard: {
    ariaLabel: 'Flip board',
  },
  planBoard: {
    label: 'Plan',
    navLabels: {
      start: 'Start of plan',
      previous: 'Previous plan move',
      next: 'Next plan move',
      end: 'End of plan',
    },
  },
  analysisPanel: {
    viewAnalysis: 'View analysis',
    analyzing: 'Analyzing',
    reanalyzing: 'Re-analyzing',
    analyzeWithStockfish: 'Analyze with Stockfish',
    reanalyze: 'Re-analyze',
    analysisFailed: 'Analysis failed.',
    cleanGameNoBlunders: 'Clean game — no significant blunders from either side.',
    stockfishAnalysis: 'Stockfish analysis',
    noBlundersFoundClean: 'No blunders found by Stockfish — clean game.',
    blundersFound: (n: number) => `${n} ${n === 1 ? 'blunder' : 'blunders'} found. Biggest:`,
    biggestMoment: (isMine: boolean, isBlunder: boolean) =>
      `Biggest moment: ${isMine ? 'you' : 'your opponent'} ${isBlunder ? 'blundered' : 'made a mistake'} on`,
  },
  bulkAnalyze: {
    button: 'Analyze all',
    cancel: 'Cancel',
    nothingToAnalyze: 'Nothing to analyze — every game already has one.',
    analysisFailed: 'Analysis failed.',
    analyzingProgress: (gameIndex: number, gamesTotal: number) =>
      `Analyzing game ${gameIndex} of ${gamesTotal}`,
    positionsProgress: (done: number, total: number) => `(${done}/${total} positions)`,
    analyzed: (analyzed: number, total: number) =>
      analyzed === total
        ? `Analyzed ${analyzed} game${analyzed === 1 ? '' : 's'}.`
        : `Analyzed ${analyzed} of ${total} games — stopped early.`,
  },
  sync: {
    button: 'Sync games',
    syncing: 'Syncing…',
    failed: 'Sync failed.',
    synced: (archives: number, games: number) =>
      `Synced ${archives} archive${archives === 1 ? '' : 's'}, ${games} game${games === 1 ? '' : 's'} added.`,
  },
  drill: {
    hint: '💡 Hint',
    correct: 'Correct!',
    notQuite: (moves: string) => `Not quite — the move was ${moves}.`,
    or: 'or',
    next: 'Next',
    findPreparedMove: 'Find your prepared move',
    findBestMove: 'Find the best move',
    cardOf: (index: number, total: number) => `card ${index} of ${total}`,
    hintText: (pieces: string) => `Hint: it's a ${pieces} move.`,
    keyboardHint: 'Space/Enter → Next · H → Hint',
    sessionComplete: 'Session complete',
    tally: (correct: number, incorrect: number, total: number) =>
      `${correct} correct, ${incorrect} incorrect out of ${total}.`,
    shuffleAndRestart: 'Shuffle and restart',
    moreDue: (n: number) => `${n} more due — load more`,
    nothingToDrillYet:
      'Nothing to drill yet — build a repertoire and analyze some games to start building a deck.',
    noCardsDue: (filtered: boolean, total: number) =>
      `No ${filtered ? 'matching cards' : 'cards'} due right now (${total} in your deck) — nice work. Check back later.`,
  },
  lessonPractice: {
    study: 'Study',
    quiz: 'Quiz',
    playedGames: (games: number, wins: number, draws: number, losses: number) =>
      `You've played this in ${games} of your games (${wins}W ${draws}D ${losses}L)`,
    neverPlayed: "You haven't played this exact line in any synced games yet",
    seeOpeningStats: 'see your opening stats',
  },
  lessonQuiz: {
    lineComplete: 'Line complete!',
    playingAs: (color: string, move: number, total: number) =>
      `Playing as ${color} — move ${move} of ${total}`,
    opponentsMove: "Opponent's move…",
    restart: '⟲ Restart',
    showMove: '💡 Show move',
    perfect: 'Played it perfectly — no mistakes or hints.',
    summary: (mistakes: number, hints: number) =>
      `${mistakes} mistake${mistakes === 1 ? '' : 's'}, ${hints} hint${hints === 1 ? '' : 's'} used.`,
    notQuiteTryAgain: 'Not quite — try again.',
    keyboardHint: 'H → Show move · R → Restart',
  },
  aboutOpening: {
    about: (name: string) => `About ${name}`,
    adaptedFrom: "Adapted from Wikibooks' Chess Opening Theory",
  },
  knightIcon: {
    playingAs: (color: string) => `Playing as ${color}`,
  },
  repertoire: {
    title: 'Repertoire',
    start: '⏮ Start',
    back: '◀ Back',
    deleteLine: 'Delete this line',
    alternativesHere: 'Alternatives here:',
    failedToSave: 'Failed to save move.',
    failedToDelete: 'Failed to delete.',
    helpAriaLabel: 'How to use this screen',
    helpTitle: 'How to use this screen',
    helpP1: `A repertoire is the set of opening moves you've decided to play and practice, one tree per color. Building it here means picking the move(s) you want to play (or expect from the opponent) at each position you'll actually reach — so your games and drills check you against your own plan, not chess theory in general.`,
    helpP2: `Drag, or click a piece then a destination, to record your prep. Playing a move that's already in the tree just navigates into it; a new move adds a branch. Multiple branches from the same position are fine — that's how you prepare for more than one opponent try.`,
    noMovesYet:
      'No moves recorded yet — drag a piece on the board to start building this repertoire.',
  },
  gamesPage: {
    title: 'Games',
    previous: 'Previous',
    next: 'Next',
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
  },
  blundersPage: {
    title: 'Blunders',
    summary: (blunders: number, analyzed: number, total: number) =>
      `${blunders} ${blunders === 1 ? 'blunder' : 'blunders'} across ${analyzed} of ${total} synced games analyzed by Stockfish.`,
  },
  drillPage: {
    title: 'Drill',
  },
  learnPage: {
    title: 'Learn',
    intro:
      'Short, plain-language introductions to common openings and endgames — not a repertoire, just the ideas behind one natural line, move by move.',
    endgames: 'Endgames',
  },
  openingsPage: {
    title: 'Openings',
    intro: 'Grouped by ECO family. Click a row to see the specific named lines within it.',
  },
  gamePage: {
    noEco: 'no ECO',
    ecoTooltip:
      'ECO code — a standard reference number for this opening, used to group games by opening regardless of the exact move order',
    learnMoreAboutOpening: 'Learn more about this opening',
    viewOnChessCom: 'View on Chess.com',
    unparsedMoves: `This game's moves couldn't be parsed (likely a non-standard variant) — showing the raw PGN instead.`,
    playing: (color: string) => `playing ${color}`,
    noRepertoireYet: (color: string) => `No ${color} repertoire defined yet —`,
    buildOne: 'build one',
    inBookTooltip: 'Still following your prepared moves up to this point',
    inBook: 'In book',
    deviatedTooltip: 'Played a different move than the one saved in your repertoire at this point',
    deviated: 'deviated',
    inBookFor: (n: number) => `for ${n} ${n === 1 ? 'move' : 'moves'}, then`,
    played: 'played',
    repertoireHas: 'repertoire has',
    followedRepertoire: (n: number) =>
      `Followed your repertoire the entire game (${n} ${n === 1 ? 'move' : 'moves'}).`,
  },
  metadata: {
    title: 'Blitzr',
    description:
      'Train on your own blunders, not generic puzzles — a local chess trainer built from your real Chess.com games.',
  },
}

type Strings = typeof en

const es: Strings = {
  common: {
    close: 'Cerrar',
    vs: 'vs',
    betterWas: 'Mejor era',
    color: { white: 'Blancas', black: 'Negras' },
    result: { win: 'Victoria', draw: 'Tablas', loss: 'Derrota' },
    timeClass: { bullet: 'Bala', blitz: 'Blitz', rapid: 'Rápidas', daily: 'Por correspondencia' },
    pawns: (n: number) => `${n.toFixed(1)} peones`,
  },
  nav: {
    games: 'Partidas',
    openings: 'Aperturas',
    learn: 'Aprender',
    repertoire: 'Repertorio',
    drill: 'Entrenar',
    blunders: 'Errores',
  },
  gameRow: {
    timeClassTooltips: {
      bullet: 'Bala — menos de 3 minutos por jugador',
      blitz: 'Blitz — de 3 a 10 minutos por jugador',
      rapid: 'Rápidas — de 10 a 30 minutos por jugador',
      daily:
        'Por correspondencia — ajedrez por correo, días por jugada en vez de un reloj corriendo',
    } as Record<string, string>,
  },
  blunderBadge: {
    labels: { mistake: 'Error', blunder: 'Error grave' },
    titles: {
      mistake:
        'Un error de entre 2 y 4 peones de diferencia — la menos grave de las dos categorías',
      blunder: 'Un error de 4 peones o más de diferencia — la más grave de las dos categorías',
    },
  },
  drillFilters: {
    all: 'Todas',
    deviations: 'Desviaciones',
    deviationsTitle: 'Tarjetas de partidas donde te saliste de tus propias jugadas preparadas',
    blunders: 'Errores',
    blundersTitle:
      'Tarjetas de tus propias jugadas que perdieron al menos 2 peones de ventaja, según Stockfish',
    allOpenings: 'Todas las aperturas',
  },
  gameList: {
    empty:
      'Aún no hay partidas sincronizadas. Haz clic en "Sincronizar partidas" para traer tu historial de Chess.com.',
    headers: {
      date: 'Fecha',
      color: 'Color',
      opponent: 'Rival',
      result: 'Resultado',
      opening: 'Apertura',
      timeClass: 'Ritmo',
    },
  },
  openingsTable: {
    empty:
      'Aún no hay partidas sincronizadas. Sincroniza partidas desde la página de Partidas para ver tus estadísticas de aperturas.',
    headers: {
      opening: 'Apertura',
      eco: 'ECO',
      games: 'Partidas',
      wdl: 'V / T / D',
      asWhite: 'Con blancas',
      asBlack: 'Con negras',
    },
  },
  blunderStats: {
    emptyNoAnalyzed:
      'Aún no hay partidas analizadas — abre una partida y haz clic en "Analizar con Stockfish" para empezar a acumular datos.',
    emptyNoBlunders: (n: number) =>
      `No se encontraron errores en tus ${n} ${n === 1 ? 'partida analizada' : 'partidas analizadas'} — limpio por ahora.`,
    byOpening: 'Por apertura',
    byPiece: 'Por pieza',
    worstBlunders: 'Peores errores',
    avgSwing: 'Diferencia media',
    avgSwingTooltip: 'Cuántos peones peoró la posición, en promedio, a lo largo de estos errores',
  },
  evalHelp: {
    summary: 'Cómo interpretar esto',
    entries: [
      {
        term: '22… a6',
        body: '— jugada 22, jugada por las negras. Un número simple (22.) es la jugada de las blancas; los puntos suspensivos (22…) marcan la respuesta de las negras.',
      },
      {
        term: '+1.4 / -0.8',
        body: 'cuánta ventaja tienen las blancas (positivo) o las negras (negativo), en una unidad de "peones de ventaja". Combina material y posición en un solo número, así que +1.4 no significa un peón extra literal — solo una ventaja de ese orden.',
      },
      {
        term: 'M7 / -M3',
        body: 'un jaque mate forzado en esa cantidad de jugadas, sin importar cómo responda el rival. Una vez que se encuentra el mate, el número en peones deja de aplicarse por completo.',
      },
      {
        term: 'Error grave',
        body: 'Una jugada que empeoró la posición al menos 2 peones respecto a la mejor jugada disponible, para quien acaba de jugarla. Esto es relativo a la mejor jugada, no a si ese lado ya iba ganando o perdiendo — una posición perdida también puede empeorar, y eso también cuenta.',
      },
      {
        term: 'Error / Error grave',
        body: 'Dos niveles de gravedad dentro de lo que ya cuenta como error arriba: menos de 4 peones de diferencia se etiqueta Error, 4 peones o más se etiqueta Error grave. Ambos cuentan igual como "un error" en el resto de la app (entrenamiento, los totales de arriba) — esto es solo una lectura más fina de qué tan malo fue.',
      },
      {
        term: 'Diferencia',
        body: 'Cuántos peones empeoró una jugada la posición para quien la jugó. La "diferencia media" promedia eso a lo largo de un grupo de errores — una forma de ver si una categoría tiende a ser casi-aciertos o desastres directos.',
      },
      {
        term: 'Mejor era …',
        body: 'Lo que Stockfish habría jugado en su lugar, desde la posición justo antes del error. La misma sugerencia se dibuja como una flecha amarilla en el tablero, en la posición que estés viendo en ese momento.',
      },
    ],
  },
  board: {
    navLabels: {
      start: 'Inicio',
      previous: 'Jugada anterior',
      next: 'Jugada siguiente',
      end: 'Final',
    },
    startingPositionButton: 'Posición inicial',
    material: 'Material:',
  },
  moveExplanation: {
    startingPosition: 'Posición inicial.',
  },
  flipBoard: {
    ariaLabel: 'Girar tablero',
  },
  planBoard: {
    label: 'Plan',
    navLabels: {
      start: 'Inicio del plan',
      previous: 'Jugada anterior del plan',
      next: 'Jugada siguiente del plan',
      end: 'Final del plan',
    },
  },
  analysisPanel: {
    viewAnalysis: 'Ver análisis',
    analyzing: 'Analizando',
    reanalyzing: 'Reanalizando',
    analyzeWithStockfish: 'Analizar con Stockfish',
    reanalyze: 'Reanalizar',
    analysisFailed: 'Error al analizar.',
    cleanGameNoBlunders: 'Partida limpia — sin errores importantes de ningún lado.',
    stockfishAnalysis: 'Análisis de Stockfish',
    noBlundersFoundClean: 'Stockfish no encontró errores — partida limpia.',
    blundersFound: (n: number) =>
      `${n} ${n === 1 ? 'error encontrado' : 'errores encontrados'}. El peor:`,
    biggestMoment: (isMine: boolean, isBlunder: boolean) =>
      isMine
        ? `Momento clave: cometiste ${isBlunder ? 'un error grave' : 'un error'} en`
        : `Momento clave: tu rival cometió ${isBlunder ? 'un error grave' : 'un error'} en`,
  },
  bulkAnalyze: {
    button: 'Analizar todas',
    cancel: 'Cancelar',
    nothingToAnalyze: 'Nada que analizar — todas las partidas ya tienen análisis.',
    analysisFailed: 'Error al analizar.',
    analyzingProgress: (gameIndex: number, gamesTotal: number) =>
      `Analizando partida ${gameIndex} de ${gamesTotal}`,
    positionsProgress: (done: number, total: number) => `(${done}/${total} posiciones)`,
    analyzed: (analyzed: number, total: number) =>
      analyzed === total
        ? `${analyzed} ${analyzed === 1 ? 'partida analizada' : 'partidas analizadas'}.`
        : `${analyzed} de ${total} partidas analizadas — detenido antes de tiempo.`,
  },
  sync: {
    button: 'Sincronizar partidas',
    syncing: 'Sincronizando…',
    failed: 'Error al sincronizar.',
    synced: (archives: number, games: number) =>
      `${archives} ${archives === 1 ? 'archivo sincronizado' : 'archivos sincronizados'}, ${games} ${games === 1 ? 'partida añadida' : 'partidas añadidas'}.`,
  },
  drill: {
    hint: '💡 Pista',
    correct: '¡Correcto!',
    notQuite: (moves: string) => `No exactamente — la jugada era ${moves}.`,
    or: 'o',
    next: 'Siguiente',
    findPreparedMove: 'Encuentra tu jugada preparada',
    findBestMove: 'Encuentra la mejor jugada',
    cardOf: (index: number, total: number) => `tarjeta ${index} de ${total}`,
    hintText: (pieces: string) => `Pista: es una jugada de ${pieces}.`,
    keyboardHint: 'Espacio/Intro → Siguiente · H → Pista',
    sessionComplete: 'Sesión completa',
    tally: (correct: number, incorrect: number, total: number) =>
      `${correct} correctas, ${incorrect} incorrectas de ${total}.`,
    shuffleAndRestart: 'Mezclar y reiniciar',
    moreDue: (n: number) => `${n} más pendientes — cargar más`,
    nothingToDrillYet:
      'Aún no hay nada que entrenar — arma un repertorio y analiza algunas partidas para empezar a construir un mazo.',
    noCardsDue: (filtered: boolean, total: number) =>
      `No hay ${filtered ? 'tarjetas que coincidan' : 'tarjetas'} pendientes ahora mismo (${total} en tu mazo) — buen trabajo. Vuelve más tarde.`,
  },
  lessonPractice: {
    study: 'Estudiar',
    quiz: 'Cuestionario',
    playedGames: (games: number, wins: number, draws: number, losses: number) =>
      `Has jugado esto en ${games} de tus partidas (${wins}V ${draws}E ${losses}D)`,
    neverPlayed: 'Aún no has jugado esta línea exacta en ninguna partida sincronizada',
    seeOpeningStats: 'ver tus estadísticas de apertura',
  },
  lessonQuiz: {
    lineComplete: '¡Línea completa!',
    playingAs: (color: string, move: number, total: number) =>
      `Jugando con ${color} — jugada ${move} de ${total}`,
    opponentsMove: 'Jugada del rival…',
    restart: '⟲ Reiniciar',
    showMove: '💡 Mostrar jugada',
    perfect: 'Jugado a la perfección — sin errores ni pistas.',
    summary: (mistakes: number, hints: number) =>
      `${mistakes} ${mistakes === 1 ? 'error' : 'errores'}, ${hints} ${hints === 1 ? 'pista usada' : 'pistas usadas'}.`,
    notQuiteTryAgain: 'No exactamente — inténtalo de nuevo.',
    keyboardHint: 'H → Mostrar jugada · R → Reiniciar',
  },
  aboutOpening: {
    about: (name: string) => `Sobre ${name}`,
    adaptedFrom: 'Adaptado de Chess Opening Theory de Wikibooks',
  },
  knightIcon: {
    playingAs: (color: string) => `Jugando con ${color}`,
  },
  repertoire: {
    title: 'Repertorio',
    start: '⏮ Inicio',
    back: '◀ Atrás',
    deleteLine: 'Eliminar esta línea',
    alternativesHere: 'Alternativas aquí:',
    failedToSave: 'No se pudo guardar la jugada.',
    failedToDelete: 'No se pudo eliminar.',
    helpAriaLabel: 'Cómo usar esta pantalla',
    helpTitle: 'Cómo usar esta pantalla',
    helpP1:
      'Un repertorio es el conjunto de jugadas de apertura que decidiste jugar y practicar, un árbol por color. Construirlo aquí significa elegir la(s) jugada(s) que quieres jugar (o esperas del rival) en cada posición que realmente vayas a alcanzar — así tus partidas y entrenamientos te evalúan contra tu propio plan, no contra la teoría del ajedrez en general.',
    helpP2:
      'Arrastra, o haz clic en una pieza y luego en un destino, para registrar tu preparación. Jugar una jugada que ya está en el árbol simplemente navega hacia ella; una jugada nueva agrega una rama. Tener varias ramas desde la misma posición está bien — así te preparas para más de una posible respuesta del rival.',
    noMovesYet:
      'Aún no hay jugadas registradas — arrastra una pieza en el tablero para empezar a construir este repertorio.',
  },
  gamesPage: {
    title: 'Partidas',
    previous: 'Anterior',
    next: 'Siguiente',
    pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
  },
  blundersPage: {
    title: 'Errores',
    summary: (blunders: number, analyzed: number, total: number) =>
      `${blunders} ${blunders === 1 ? 'error' : 'errores'} en ${analyzed} de ${total} partidas sincronizadas analizadas por Stockfish.`,
  },
  drillPage: {
    title: 'Entrenar',
  },
  learnPage: {
    title: 'Aprender',
    intro:
      'Introducciones breves y en lenguaje sencillo a aperturas y finales comunes — no es un repertorio, solo las ideas detrás de una línea natural, jugada por jugada.',
    endgames: 'Finales',
  },
  openingsPage: {
    title: 'Aperturas',
    intro:
      'Agrupadas por familia ECO. Haz clic en una fila para ver las líneas específicas dentro de ella.',
  },
  gamePage: {
    noEco: 'sin ECO',
    ecoTooltip:
      'Código ECO — un número de referencia estándar para esta apertura, usado para agrupar partidas por apertura sin importar el orden exacto de jugadas',
    learnMoreAboutOpening: 'Aprender más sobre esta apertura',
    viewOnChessCom: 'Ver en Chess.com',
    unparsedMoves:
      'No se pudieron interpretar las jugadas de esta partida (probablemente una variante no estándar) — mostrando el PGN sin procesar en su lugar.',
    playing: (color: string) => `jugando con ${color}`,
    noRepertoireYet: (color: string) => `Aún no hay repertorio de ${color} definido —`,
    buildOne: 'crea uno',
    inBookTooltip: 'Todavía siguiendo tus jugadas preparadas hasta este punto',
    inBook: 'En libro',
    deviatedTooltip: 'Jugaste una jugada distinta a la guardada en tu repertorio en este punto',
    deviated: 'te saliste',
    inBookFor: (n: number) => `durante ${n} ${n === 1 ? 'jugada' : 'jugadas'}, luego`,
    played: 'jugaste',
    repertoireHas: 'el repertorio tiene',
    followedRepertoire: (n: number) =>
      `Seguiste tu repertorio toda la partida (${n} ${n === 1 ? 'jugada' : 'jugadas'}).`,
  },
  metadata: {
    title: 'Blitzr',
    description:
      'Entrena con tus propios errores, no con puzzles genéricos — un entrenador de ajedrez local hecho con tus partidas reales de Chess.com.',
  },
}

const STRINGS: Record<Locale, Strings> = { en, es }

export function getStrings(): Strings {
  return STRINGS[getLocale()]
}
