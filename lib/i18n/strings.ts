import type { GameEndReason } from '../gameEnd'
import type { LossReason } from '../today'
import { getLocale, Locale } from './locale'

// `es` is typed against `typeof en`, so a missing translation is a compile
// error. Parameterized text is a function value.

const en = {
  common: {
    close: 'Close',
    show: 'Show',
    vs: 'vs',
    betterWas: 'Better was',
    color: { white: 'White', black: 'Black' },
    result: { win: 'Win', draw: 'Draw', loss: 'Loss' },
    timeClass: { bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', daily: 'Daily' },
    pawns: (n: number) => `${n.toFixed(1)} pawns`,
  },
  nav: {
    today: 'Today',
    games: 'Games',
    openings: 'Openings',
    learn: 'Learn',
    repertoire: 'Repertoire',
    drill: 'Drill',
    blunders: 'Blunders',
    puzzles: 'Puzzles',
    collapse: 'Collapse',
    expand: 'Expand',
  },
  today: {
    title: 'Today',
    unanalyzed: (n: number) => `${n} game${n === 1 ? '' : 's'} not analyzed yet`,
    noGames: 'No games yet — sync your Chess.com history to fill this page.',
    goToGames: 'Go to Games',
    drillTitle: 'Drill',
    sessionCards: (n: number): string =>
      n === 1 ? "card in today's session" : "cards in today's session",
    dueBreakdown: (
      due: number,
      deviations: number,
      blunders: number,
      punishes: number,
      mates: number,
    ) =>
      `${due} due: ${deviations} repertoire, ${blunders} blunder${punishes ? `, ${punishes} missed punishment` : ''}${mates ? `, ${mates} missed mate` : ''}`,
    streak: (days: number) => `${days}-day streak`,
    noStreak: 'Drill today to start a streak',
    keepStreak: 'Drill today to keep it',
    streakWeek: 'Days drilled this week (today on the right)',
    startDrill: 'Start drilling',
    accuracyTitle: 'Last 7 days',
    accuracyVsAverage: (games: number, overall: number) =>
      `Accuracy over ${games} game${games === 1 ? '' : 's'}, against ${overall}% on average`,
    noRecentGames: 'No analyzed games in the last 7 days.',
    seeBlunders: 'See blunders',
    record: (w: number, l: number, d: number) => `${w} won · ${l} lost · ${d} drawn`,
    focusTitle: 'Focus',
    weakSpotLabel: 'Most blunders this week',
    weakSpotDetail: (n: number) => `${n} blunder${n === 1 ? '' : 's'}`,
    drillOpening: 'Drill it',
    worstBlunderLabel: 'Worst blunder this week',
    reviewIt: 'Review',
    lossesHeading: (n: number) => `${n} loss${n === 1 ? '' : 'es'} this week`,
    lossReasons: {
      timeout: 'on time',
      resigned: 'resigned',
      checkmate: 'checkmated',
      abandoned: 'abandoned',
      other: 'other',
    } satisfies Record<LossReason, string>,
    lessonLabel: 'Suggested lesson',
    lessonDetail: (n: number) => `You reached it in ${n} game${n === 1 ? '' : 's'} this week`,
    studyLesson: 'Study',
    noWeakSpot: 'No blunders in analyzed games this week.',
    repertoireLabel: 'Repertoire',
    repertoireDeviations: (deviated: number, considered: number) =>
      `Left it in ${deviated} of your last ${considered} games`,
    noRepertoire: 'No repertoire to check your games against yet.',
    buildRepertoire: 'Build one',
    lastGameTitle: 'Last game',
    lastGameVs: (opponent: string) => `vs ${opponent}`,
    notAnalyzed: 'Not analyzed yet.',
    lastGameAccuracy: (accuracy: number) => `${accuracy}% accuracy`,
    firstBlunder: (move: number) => `First blunder on move ${move}`,
    noBlunders: 'No blunders',
    noLastGame: 'No games yet.',
    lastSynced: (ago: string) => `Last synced ${ago}`,
    puzzleTitle: 'Next puzzle',
    puzzleLabel: (id: number, kind: string) => `#${id} · ${kind}`,
    allPuzzlesSolved: 'Every puzzle is solved.',
    puzzleRetry: 'You revealed this one: try it again.',
  },
  settings: {
    trigger: 'Settings',
    title: 'Settings',
    darkTheme: 'Dark theme',
    boardColors: 'Board colors',
    presets: {
      green: 'Green',
      brown: 'Brown',
      blue: 'Blue',
      purple: 'Purple',
    } as Record<string, string>,
    analysisStrength: 'Analysis strength',
    analysisStrengthHint: 'Engine think time per move — deeper is slower but more accurate',
    analysisStrengths: { fast: 'Fast', normal: 'Normal', deep: 'Deep' },
    hideEngineHints: 'Hide eval bar and best-move arrow',
    hideEngineHintsHint: 'Review a game without engine spoilers',
    showCoordinates: 'Show board coordinates',
    moveSounds: 'Move sounds',
    moveSoundsCredit: 'Sounds © Chess.com, loaded from their site',
    trainingOrientation: 'Lesson & puzzle board orientation',
    trainingOrientations: { auto: 'Side to play', white: 'Always White', black: 'Always Black' },
    playSpeed: 'Auto-play speed',
    playSpeeds: { slow: 'Slow', normal: 'Normal', fast: 'Fast' },
    playSpeedTitle: (ms: number) => `One move every ${ms / 1000}s`,
    preview: 'Preview',
    drillSessionSize: 'Cards per drill session',
    drillSessionSizeHint: 'The most overdue cards come first',
    backup: 'Download backup',
    backupPreparing: 'Preparing…',
    backupHint:
      'A copy of the whole database. Your repertoire, drill schedules and puzzle progress can’t be rebuilt by re-syncing.',
    backupRestoreHint:
      'To restore, stop Blitzr and replace data/blitzr.db with the downloaded file.',
    backupFailed: 'Couldn’t create the backup.',
    sections: {
      appearance: 'Appearance',
      board: 'Board',
      analysis: 'Analysis',
      training: 'Training',
      data: 'Data',
    },
  },
  gameRow: {
    notMine: 'Not you',
    timeClassTooltips: {
      bullet: 'Bullet — under 3 minutes per player',
      blitz: 'Blitz — 3 to 10 minutes per player',
      rapid: 'Rapid — 10 to 30 minutes per player',
      daily: 'Daily — correspondence chess, days per move rather than a running clock',
    } as Record<string, string>,
  },
  blunderBadge: {
    labels: { serious: 'Serious', severe: 'Severe' },
    titles: {
      serious:
        'A blunder costing as much as 2–4 pawns would from an equal position — the smaller of the two severities',
      severe:
        'A blunder costing as much as 4+ pawns would from an equal position — the more severe of the two severities',
    },
  },
  drillFilters: {
    all: 'All',
    deviations: 'Deviations',
    deviationsTitle: 'Cards for games where you left your own prepared repertoire moves',
    blunders: 'Blunders',
    blundersTitle:
      'Cards for your own moves that threw away real winning chances, found by Stockfish',
    punishes: 'Missed punishments',
    punishesTitle:
      "Cards for moves where your opponent blundered and your reply didn't take advantage",
    mates: 'Missed mates',
    matesTitle:
      'Cards for moves where you had a forced mate in 3 or fewer and played something else',
    clearOpening: 'Show all openings',
  },
  troubleCards: {
    title: 'Trouble cards',
    tooltip:
      'Cards you keep missing (two or more misses more than hits), the hardest first. Open the game to study the position; the answer stays hidden so they still drill.',
    kind: {
      deviation: 'Deviation',
      blunder: 'Blunder',
      punish: 'Missed punishment',
      mate: 'Missed mate',
    },
  },
  gameList: {
    empty: 'No games synced yet. Click "Sync games" to fetch your Chess.com history.',
    noMatches: 'No games match these filters.',
    headers: {
      date: 'Date',
      color: 'Color',
      opponent: 'Opponent',
      result: 'Result',
      rating: 'Rating',
      accuracy: 'Accuracy',
      errors: 'Errors',
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
    byReason: 'By tactic',
    byPhase: 'By game phase',
    byPhaseTooltip:
      'Endgame: at most 6 queens, rooks, bishops and knights left on the board. Before that, the first 10 moves count as the opening.',
    worstBlunders: 'Worst blunders',
    punishTitle: 'Punishing their blunders',
    punishTooltip:
      "Your opponents' blunders that you got a move to answer, and how often your reply was good or better — the same bar as a missed-punishment drill card",
    punishSummary: (punished: number, chances: number, pct: number) =>
      `You punished ${punished} of your opponents' ${chances} ${chances === 1 ? 'blunder' : 'blunders'} (${pct}%).`,
    avgSwing: 'Avg swing',
    avgSwingTooltip: 'How many pawns worse the position got, on average, across these blunders',
  },
  thrownWins: {
    title: 'Won positions not won',
    tooltip: (pct: number) =>
      `Games you drew or lost after your winning chances reached ${pct}% (the eval bar), linked to your best position`,
    summary: (thrown: number, analyzed: number) =>
      thrown === 0
        ? `None of your ${analyzed} analyzed ${analyzed === 1 ? 'game' : 'games'} — every winning position was won.`
        : `${thrown} of your ${analyzed} analyzed ${analyzed === 1 ? 'game' : 'games'} reached a winning position and still slipped away.`,
    peak: (evaluation: string, move: string | null) =>
      move ? `Peaked at ${evaluation} after ${move}` : `Peaked at ${evaluation} from the start`,
    result: { draw: 'Drawn', loss: 'Lost' },
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
        body: 'A move that cost whoever played it as many winning chances as losing 2 pawns from an equal position. It is measured in winning chances, not pawns: dropping from +9 to +6.5 is still completely winning, so it does not count, but the same 2.5 pawns from an equal position does.',
      },
      {
        term: 'Serious / Severe',
        body: 'Two severities within what already counts as a blunder above: costing less than 4 pawns would from an equal position is labeled Serious, more is labeled Severe. Both still count as "a blunder" everywhere else in the app (drilling, the totals above) — this is just a finer read on how bad it was.',
      },
      {
        term: 'Swing',
        body: 'How many pawns worse a move made the position for whoever played it. "Avg swing" averages that across a group of blunders — a way to see whether a category tends to be near-misses or outright disasters.',
      },
      {
        term: 'Better was …',
        body: "What Stockfish would have played instead, from the position right before the blunder. The same suggestion is drawn as a yellow arrow on the board at whichever position you're currently viewing.",
      },
      {
        term: 'Hanging piece',
        body: "A piece that's attacked and has no defender of its own — it can be captured for free.",
      },
      {
        term: 'Fork',
        body: 'One piece attacking two or more enemy pieces at once, so the defender can only save one of them.',
      },
      {
        term: 'Pin',
        body: "A piece that can't move without exposing a more valuable piece behind it (usually the king) to attack.",
      },
      {
        term: 'Skewer',
        body: 'The reverse of a pin — a valuable piece (often the king) is attacked and forced to move, exposing a less valuable piece behind it to be captured next.',
      },
    ],
  },
  board: {
    navLabels: {
      start: 'Start',
      previous: 'Previous move',
      next: 'Next move',
      end: 'End',
      play: 'Play',
      pause: 'Pause',
    },
    startingPositionButton: 'Starting position',
    material: 'Material:',
    exploring: 'Exploring',
    backToGame: 'Back to game',
    endReasons: {
      checkmate: 'Checkmate',
      winner: 'Winner',
      draw: 'Draw',
      resigned: 'Resigned',
      timeout: 'Lost on time',
      abandoned: 'Abandoned',
      lost: 'Lost',
      agreed: 'Draw agreed',
      repetition: 'Draw by repetition',
      timevsinsufficient: 'Draw: time out vs. insufficient material',
    } satisfies Record<GameEndReason, string>,
  },
  positionActions: {
    copyFen: 'Copy FEN',
    copyPgn: 'Copy PGN',
    copyLinePgn: 'Copy line PGN',
    copied: 'Copied!',
    openInLichess: 'Lichess ↗',
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
    analyzing: 'Analyzing',
    reanalyzing: 'Re-analyzing',
    analyzeWithStockfish: 'Analyze with Stockfish',
    reanalyze: 'Re-analyze',
    savedAtStrength: (strength: string) => `Saved analysis: ${strength}`,
    analysisFailed: 'Analysis failed.',
    saveFailed: "Couldn't save the analysis.",
    moveQualityLink: 'Move quality',
    accuracy: 'Accuracy',
    you: 'You',
    opponent: 'Opponent',
    yourMoves: 'Your moves to review — click one to see it on the board',
    evalGraph: 'Evaluation over the game',
    evalGraphLabel:
      "The eval bar over the whole game, first move to last: White's share in white, Black's in black. Click to jump to a move.",
    moveQuality: {
      best: 'Best',
      excellent: 'Excellent',
      good: 'Good',
      inaccuracy: 'Inaccuracy',
      mistake: 'Mistake',
      blunder: 'Blunder',
    },
    moveQualityTitles: {
      mistake:
        'Mistakes: moves costing as much as 0.6–2 pawns would from an equal position, just short of a blunder',
      blunder: 'Blunders: moves costing as much as 2+ pawns would from an equal position',
    },
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
    someFailed: (analyzed: number, failed: number, total: number) =>
      `Analyzed ${analyzed} of ${total} games — ${failed} couldn't be saved.`,
  },
  manualGame: {
    noResult:
      'PGN has no final result — add a [Result "1-0"], [Result "0-1"] or [Result "1/2-1/2"] header.',
    missingPlayers: 'PGN is missing White/Black player headers.',
    badMovetext: 'Could not parse this PGN — check the move text is valid.',
    noMoves: 'PGN has no moves — paste the full game, not just its headers.',
    duplicate: 'This game is already in Blitzr.',
    notInGame: (username: string) =>
      `Neither player is ${username} — pick the side you played, or "Not me" to keep it out of your stats.`,
  },
  sync: {
    button: 'Sync games',
    syncing: 'Syncing…',
    progress: (done: number, total: number) => `Syncing ${done}/${total} months…`,
    failed: 'Sync failed.',
    rateLimited: 'Chess.com is rate-limiting requests — try again in a few minutes.',
    userNotFound: (username: string) => `Chess.com has no player named "${username}".`,
    noUsername: 'CHESSCOM_USERNAME is not set. Copy .env.example to .env.local and fill it in.',
    synced: (archives: number, games: number) =>
      `Synced ${archives} archive${archives === 1 ? '' : 's'}, ${games} game${games === 1 ? '' : 's'} added.`,
    analyzeNew: 'Analyze them',
  },
  addPgn: {
    button: 'Add game by PGN',
    title: 'Add game by PGN',
    placeholder: 'Paste PGN here…',
    submit: 'Add game',
    adding: 'Adding…',
    genericError: 'Could not add this game.',
    sideLabel: 'You played',
    sides: {
      auto: 'Detect from my username',
      white: 'White',
      black: 'Black',
      notMine: 'Not me (keep out of my stats)',
    },
  },
  drill: {
    hint: '💡 Hint',
    correct: 'Correct!',
    correctWithHelp: 'Correct, with help — it comes back tomorrow.',
    notQuite: (moves: string) => `Not quite — the move was ${moves}.`,
    alsoGood: (moves: string) => `Good move too — the engine preferred ${moves}.`,
    checkingMove: 'Checking your move…',
    or: 'or',
    next: 'Next',
    findPreparedMove: 'Find your prepared move',
    findBestMove: 'Find the best move',
    findPunish: 'Your opponent just blundered — punish it',
    findMate: 'You have a forced mate — find the first move',
    cardOf: (index: number, total: number) => `Card ${index} of ${total}`,
    hintText: (pieces: string) => `Hint: it's a ${pieces} move.`,
    keyboardHint: 'Space/Enter → Next · H → Hint · U → Undo',
    undo: 'Undo',
    undoFailed: "Couldn't undo that answer.",
    autoAdvance: 'Go to the next card after a correct answer',
    saveFailed: (n: number) =>
      n === 1
        ? "Couldn't save an answer, so its card keeps its old schedule."
        : `Couldn't save ${n} answers, so their cards keep their old schedule.`,
    retrySave: 'Try again',
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
    gapsTitle: 'Where your games leave your prep',
    gapsTooltip:
      'The lines your games most often played past the end of this tree (or an opponent move it has no answer for). Click one to jump to where the next move would go.',
    gapGames: (n: number) => `${n} ${n === 1 ? 'game' : 'games'}`,
  },
  gamesPage: {
    title: 'Games',
    searchPlaceholder: 'Search by opponent name…',
    previous: 'Previous',
    next: 'Next',
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    allResults: 'All results',
    allColors: 'All colors',
    allRated: 'Rated & unrated',
    rated: 'Rated only',
    unrated: 'Unrated only',
    anyAccuracy: 'Any accuracy',
    accuracyAtLeast: 'Accuracy ≥',
    accuracyAtMost: 'Accuracy ≤',
    setupUsername:
      'To get started, copy .env.example to .env.local, set CHESSCOM_USERNAME to your Chess.com username, restart Blitzr, then click "Sync games".',
    setupAnalyze:
      'Next, click "Analyze all" to find your blunders. Stockfish runs in this browser tab and keeps going while you browse other pages.',
  },
  blundersPage: {
    title: 'Blunders',
    summary: (blunders: number, analyzed: number, total: number) =>
      `${blunders} ${blunders === 1 ? 'blunder' : 'blunders'} across ${analyzed} of ${total} synced games analyzed by Stockfish.`,
  },
  dateRangeFilter: {
    from: 'From',
    to: 'To',
    clear: 'Clear',
    presets: {
      today: 'Today',
      last3Days: 'Last 3 days',
      lastWeek: 'Last week',
      last2Weeks: 'Last 2 weeks',
    },
  },
  accuracyTrend: {
    title: 'Accuracy over time',
    caption: (window: number) =>
      `Each dot is one analyzed game; the line is your rolling average over the last ${window} games.`,
    empty: 'No analyzed games in this range yet.',
    tooltipAverage: (n: number) => `${n}-game average`,
    showDots: 'Show individual games',
  },
  drillPage: {
    title: 'Drill',
  },
  puzzles: {
    toMove: (color: 'white' | 'black'): string =>
      color === 'white' ? 'White to move' : 'Black to move',
    mateIn: (n: number) => `Mate in ${n}`,
    defendMateIn: (n: number) => `Stop mate in ${n}`,
    defendPrompt: 'Your opponent threatens mate. Find the move that stops it.',
    allowsMate: 'That allows mate — try again.',
    savesLabel: 'Moves that stop the mate',
    inTheGameLabel: 'What happened in the game',
    incorrect: 'Not quite — try again.',
    solved: 'Solved!',
    saveFailed: "Couldn't save your progress, so this puzzle will show as unsolved after a reload.",
    retrySave: 'Try again',
    revealedTitle: 'Solution',
    reveal: 'Reveal solution',
    solvedBadge: 'Solved',
    rating: (rating: number) => `rated ${rating}`,
    viewOnLichess: 'View on Lichess',
    choosePromotion: 'Promote to:',
    movesLabel: 'Moves',
  },
  puzzlesPage: {
    title: 'Puzzles',
    intro:
      'Forced-mate puzzles — play out the winning line yourself, or find the move that stops one. No hints, no engine.',
    solvedCount: (solved: number, total: number) => `${solved} of ${total} solved`,
    empty: 'No puzzles loaded yet.',
    noneMatch: 'No puzzles match these filters.',
    previous: 'Previous puzzle',
    next: 'Next puzzle',
    nextUnsolved: 'Next unsolved ▶',
    backToList: 'All puzzles',
    pagePrevious: 'Previous',
    pageNext: 'Next',
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    filters: {
      allStatus: 'All',
      solvedOnly: 'Solved',
      unsolvedOnly: 'Unsolved',
      allColors: 'Any color',
      allMateIn: 'Any length',
      allKinds: 'Mate or defend',
      mateKind: 'Give mate',
      defendKind: 'Stop mate',
    },
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
    notMine: 'not your game — kept out of your stats',
    deleteGame: 'Delete game',
    deleteGameConfirm: 'Delete this pasted game, its analysis and its drill cards?',
  },
  liveAnalysis: {
    panelTitle: 'Engine lines',
    thinking: 'Thinking…',
    yourLine: 'Your line:',
    playLine: 'Play this line on the board',
    lineQueued: 'Queued — step through it with ◀/▶',
    resetLine: 'Clear this line — back to where you started exploring',
  },
  routeStatus: {
    errorTitle: 'Something went wrong',
    errorBody:
      'This page failed to load. It may be temporary: Chess.com down, or the database busy.',
    retry: 'Retry',
    notFoundTitle: 'Not found',
    notFoundBody: "This page doesn't exist, or the game was deleted.",
    backToGames: 'Back to games',
    loading: 'Loading…',
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
    show: 'Mostrar',
    vs: 'vs',
    betterWas: 'Mejor era',
    color: { white: 'Blancas', black: 'Negras' },
    result: { win: 'Victoria', draw: 'Tablas', loss: 'Derrota' },
    timeClass: { bullet: 'Bala', blitz: 'Blitz', rapid: 'Rápidas', daily: 'Diaria' },
    pawns: (n: number) => `${n.toFixed(1)} peones`,
  },
  nav: {
    today: 'Hoy',
    games: 'Partidas',
    openings: 'Aperturas',
    learn: 'Aprender',
    repertoire: 'Repertorio',
    drill: 'Entrenar',
    blunders: 'Errores',
    puzzles: 'Problemas',
    collapse: 'Contraer',
    expand: 'Expandir',
  },
  today: {
    title: 'Hoy',
    unanalyzed: (n: number) => `${n} ${n === 1 ? 'partida sin analizar' : 'partidas sin analizar'}`,
    noGames: 'Aún no hay partidas — sincroniza tu historial de Chess.com para llenar esta página.',
    goToGames: 'Ir a Partidas',
    drillTitle: 'Entrenar',
    sessionCards: (n: number): string =>
      n === 1 ? 'tarjeta en la sesión de hoy' : 'tarjetas en la sesión de hoy',
    dueBreakdown: (
      due: number,
      deviations: number,
      blunders: number,
      punishes: number,
      mates: number,
    ) =>
      `${due} pendientes: ${deviations} de repertorio, ${blunders} de errores${punishes ? `, ${punishes} sin castigar` : ''}${mates ? `, ${mates} de mate perdido` : ''}`,
    streak: (days: number) => `Racha de ${days} ${days === 1 ? 'día' : 'días'}`,
    noStreak: 'Entrena hoy para empezar una racha',
    keepStreak: 'Entrena hoy para mantenerla',
    streakWeek: 'Días entrenados esta semana (hoy a la derecha)',
    startDrill: 'Empezar a entrenar',
    accuracyTitle: 'Últimos 7 días',
    accuracyVsAverage: (games: number, overall: number) =>
      `Precisión en ${games} ${games === 1 ? 'partida' : 'partidas'}, frente a un ${overall}% de media`,
    noRecentGames: 'No hay partidas analizadas en los últimos 7 días.',
    seeBlunders: 'Ver errores',
    record: (w: number, l: number, d: number) => `${w} ganadas · ${l} perdidas · ${d} tablas`,
    focusTitle: 'En qué centrarte',
    weakSpotLabel: 'Más errores esta semana',
    weakSpotDetail: (n: number) => `${n} ${n === 1 ? 'error' : 'errores'}`,
    drillOpening: 'Entrénala',
    worstBlunderLabel: 'Peor error de la semana',
    reviewIt: 'Revisar',
    lossesHeading: (n: number) => `${n} ${n === 1 ? 'derrota' : 'derrotas'} esta semana`,
    lossReasons: {
      timeout: 'por tiempo',
      resigned: 'por abandono',
      checkmate: 'por jaque mate',
      abandoned: 'por desconexión',
      other: 'otras',
    } satisfies Record<LossReason, string>,
    lessonLabel: 'Lección sugerida',
    lessonDetail: (n: number) =>
      `Llegaste a ella en ${n} ${n === 1 ? 'partida' : 'partidas'} esta semana`,
    studyLesson: 'Estudiar',
    noWeakSpot: 'Ningún error en las partidas analizadas esta semana.',
    repertoireLabel: 'Repertorio',
    repertoireDeviations: (deviated: number, considered: number) =>
      `Te saliste en ${deviated} de tus últimas ${considered} partidas`,
    noRepertoire: 'Aún no tienes un repertorio con el que comparar tus partidas.',
    buildRepertoire: 'Crea uno',
    lastGameTitle: 'Última partida',
    lastGameVs: (opponent: string) => `contra ${opponent}`,
    notAnalyzed: 'Aún sin analizar.',
    lastGameAccuracy: (accuracy: number) => `${accuracy}% de precisión`,
    firstBlunder: (move: number) => `Primer error en la jugada ${move}`,
    noBlunders: 'Sin errores',
    noLastGame: 'Aún no hay partidas.',
    lastSynced: (ago: string) => `Última sincronización ${ago}`,
    puzzleTitle: 'Siguiente problema',
    puzzleLabel: (id: number, kind: string) => `#${id} · ${kind}`,
    allPuzzlesSolved: 'Todos los problemas están resueltos.',
    puzzleRetry: 'Viste la solución de este: inténtalo de nuevo.',
  },
  settings: {
    trigger: 'Ajustes',
    title: 'Ajustes',
    darkTheme: 'Tema oscuro',
    boardColors: 'Colores del tablero',
    presets: {
      green: 'Verde',
      brown: 'Marrón',
      blue: 'Azul',
      purple: 'Morado',
    },
    analysisStrength: 'Fuerza del análisis',
    analysisStrengthHint:
      'Tiempo de cálculo del motor por jugada — más profundo es más lento pero más preciso',
    analysisStrengths: { fast: 'Rápido', normal: 'Normal', deep: 'Profundo' },
    hideEngineHints: 'Ocultar barra de evaluación y flecha de mejor jugada',
    hideEngineHintsHint: 'Revisa una partida sin spoilers del motor',
    showCoordinates: 'Mostrar coordenadas del tablero',
    moveSounds: 'Sonido de jugadas',
    moveSoundsCredit: 'Sonidos © Chess.com, cargados desde su web',
    trainingOrientation: 'Orientación del tablero en lecciones y problemas',
    trainingOrientations: {
      auto: 'Bando que juega',
      white: 'Siempre blancas',
      black: 'Siempre negras',
    },
    playSpeed: 'Velocidad de reproducción',
    playSpeeds: { slow: 'Lenta', normal: 'Normal', fast: 'Rápida' },
    playSpeedTitle: (ms: number) => `Una jugada cada ${String(ms / 1000).replace('.', ',')} s`,
    preview: 'Vista previa',
    drillSessionSize: 'Tarjetas por sesión de entrenamiento',
    drillSessionSizeHint: 'Primero las tarjetas más atrasadas',
    backup: 'Descargar copia de seguridad',
    backupPreparing: 'Preparando…',
    backupHint:
      'Una copia de toda la base de datos. Tu repertorio, el calendario de repasos y el progreso en puzzles no se recuperan volviendo a sincronizar.',
    backupRestoreHint:
      'Para restaurarla, detén Blitzr y reemplaza data/blitzr.db por el archivo descargado.',
    backupFailed: 'No se pudo crear la copia de seguridad.',
    sections: {
      appearance: 'Apariencia',
      board: 'Tablero',
      analysis: 'Análisis',
      training: 'Entrenamiento',
      data: 'Datos',
    },
  },
  gameRow: {
    notMine: 'No eres tú',
    timeClassTooltips: {
      bullet: 'Bala — menos de 3 minutos por jugador',
      blitz: 'Blitz — de 3 a 10 minutos por jugador',
      rapid: 'Rápidas — de 10 a 30 minutos por jugador',
      daily:
        'Por correspondencia — ajedrez por correo, días por jugada en vez de un reloj corriendo',
    } as Record<string, string>,
  },
  blunderBadge: {
    labels: { serious: 'Grave', severe: 'Muy grave' },
    titles: {
      serious:
        'Un error grave que cuesta lo que costarían 2–4 peones desde una posición igualada — la menos grave de las dos categorías',
      severe:
        'Un error grave que cuesta lo que costarían 4+ peones desde una posición igualada — la más grave de las dos categorías',
    },
  },
  drillFilters: {
    all: 'Todas',
    deviations: 'Desviaciones',
    deviationsTitle: 'Tarjetas de partidas donde te saliste de tus propias jugadas preparadas',
    blunders: 'Errores',
    blundersTitle:
      'Tarjetas de tus propias jugadas que tiraron opciones reales de ganar, según Stockfish',
    punishes: 'Sin castigar',
    punishesTitle:
      'Tarjetas de jugadas en las que tu rival cometió un error y tu respuesta no lo aprovechó',
    mates: 'Mates perdidos',
    matesTitle:
      'Tarjetas de jugadas en las que tenías un mate forzado en 3 o menos y jugaste otra cosa',
    clearOpening: 'Mostrar todas las aperturas',
  },
  troubleCards: {
    title: 'Tarjetas difíciles',
    tooltip:
      'Tarjetas que sigues fallando (dos o más fallos más que aciertos), la más difícil primero. Abre la partida para estudiar la posición; la respuesta sigue oculta para que puedas entrenarlas.',
    kind: {
      deviation: 'Desviación',
      blunder: 'Error grave',
      punish: 'Sin castigar',
      mate: 'Mate perdido',
    },
  },
  gameList: {
    empty:
      'Aún no hay partidas sincronizadas. Haz clic en "Sincronizar partidas" para traer tu historial de Chess.com.',
    noMatches: 'Ninguna partida coincide con estos filtros.',
    headers: {
      date: 'Fecha',
      color: 'Color',
      opponent: 'Rival',
      result: 'Resultado',
      rating: 'Puntuación',
      accuracy: 'Precisión',
      errors: 'Errores',
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
    byReason: 'Por táctica',
    byPhase: 'Por fase de la partida',
    byPhaseTooltip:
      'Final: como mucho 6 damas, torres, alfiles y caballos en el tablero. Antes, las primeras 10 jugadas cuentan como apertura.',
    worstBlunders: 'Peores errores',
    punishTitle: 'Castigar sus errores',
    punishTooltip:
      'Los errores graves de tus rivales a los que pudiste responder, y cuántas veces tu respuesta fue buena o mejor — el mismo criterio que una tarjeta de error sin castigar',
    punishSummary: (punished: number, chances: number, pct: number) =>
      `Castigaste ${punished} de ${chances} ${chances === 1 ? 'error grave' : 'errores graves'} de tus rivales (${pct}%).`,
    avgSwing: 'Diferencia media',
    avgSwingTooltip: 'Cuántos peones peoró la posición, en promedio, a lo largo de estos errores',
  },
  thrownWins: {
    title: 'Posiciones ganadas sin ganar',
    tooltip: (pct: number) =>
      `Partidas que empataste o perdiste después de que tus opciones de ganar llegaran al ${pct}% (la barra de evaluación), enlazadas a tu mejor posición`,
    summary: (thrown: number, analyzed: number) =>
      thrown === 0
        ? `Ninguna de tus ${analyzed} ${analyzed === 1 ? 'partida analizada' : 'partidas analizadas'} — ganaste cada posición ganadora.`
        : `${thrown} de tus ${analyzed} ${analyzed === 1 ? 'partida analizada' : 'partidas analizadas'} llegaron a una posición ganadora y aun así se escaparon.`,
    peak: (evaluation: string, move: string | null) =>
      move ? `Máximo de ${evaluation} tras ${move}` : `Máximo de ${evaluation} desde el inicio`,
    result: { draw: 'Tablas', loss: 'Derrota' },
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
        body: 'Una jugada que le costó a quien la jugó tantas opciones de ganar como perder 2 peones desde una posición igualada. Se mide en opciones de ganar, no en peones: pasar de +9 a +6.5 sigue siendo totalmente ganador, así que no cuenta, pero los mismos 2.5 peones desde una posición igualada sí.',
      },
      {
        term: 'Grave / Muy grave',
        body: 'Dos niveles de gravedad dentro de lo que ya cuenta como error grave arriba: costar menos que 4 peones desde una posición igualada se etiqueta Grave, más se etiqueta Muy grave. Ambos cuentan igual como "un error grave" en el resto de la app (entrenamiento, los totales de arriba) — esto es solo una lectura más fina de qué tan malo fue.',
      },
      {
        term: 'Diferencia',
        body: 'Cuántos peones empeoró una jugada la posición para quien la jugó. La "diferencia media" promedia eso a lo largo de un grupo de errores — una forma de ver si una categoría tiende a ser casi-aciertos o desastres directos.',
      },
      {
        term: 'Mejor era …',
        body: 'Lo que Stockfish habría jugado en su lugar, desde la posición justo antes del error. La misma sugerencia se dibuja como una flecha amarilla en el tablero, en la posición que estés viendo en ese momento.',
      },
      {
        term: 'Pieza colgada',
        body: 'Una pieza atacada que no tiene ninguna defensa propia — se puede capturar gratis.',
      },
      {
        term: 'Horquilla',
        body: 'Una pieza que ataca a dos o más piezas enemigas a la vez, de forma que el rival solo puede salvar una.',
      },
      {
        term: 'Clavada',
        body: 'Una pieza que no puede moverse sin exponer a un ataque una pieza más valiosa (normalmente el rey) que tiene detrás.',
      },
      {
        term: 'Enfilada',
        body: 'Lo contrario de una clavada — una pieza valiosa (a menudo el rey) es atacada y obligada a moverse, dejando expuesta a captura una pieza menos valiosa que tenía detrás.',
      },
    ],
  },
  board: {
    navLabels: {
      start: 'Inicio',
      previous: 'Jugada anterior',
      next: 'Jugada siguiente',
      end: 'Final',
      play: 'Reproducir',
      pause: 'Pausar',
    },
    startingPositionButton: 'Posición inicial',
    material: 'Material:',
    exploring: 'Explorando',
    backToGame: 'Volver a la partida',
    endReasons: {
      checkmate: 'Jaque mate',
      winner: 'Ganador',
      draw: 'Tablas',
      resigned: 'Se rindió',
      timeout: 'Perdió por tiempo',
      abandoned: 'Abandonó',
      lost: 'Perdió',
      agreed: 'Tablas de mutuo acuerdo',
      repetition: 'Tablas por repetición',
      timevsinsufficient: 'Tablas: tiempo agotado sin material suficiente',
    },
  },
  positionActions: {
    copyFen: 'Copiar FEN',
    copyPgn: 'Copiar PGN',
    copyLinePgn: 'Copiar PGN de la línea',
    copied: '¡Copiado!',
    openInLichess: 'Lichess ↗',
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
    analyzing: 'Analizando',
    reanalyzing: 'Reanalizando',
    analyzeWithStockfish: 'Analizar con Stockfish',
    reanalyze: 'Reanalizar',
    savedAtStrength: (strength: string) => `Análisis guardado: ${strength}`,
    analysisFailed: 'Error al analizar.',
    saveFailed: 'No se pudo guardar el análisis.',
    moveQualityLink: 'Calidad de jugadas',
    accuracy: 'Precisión',
    you: 'Tú',
    opponent: 'Rival',
    yourMoves: 'Tus jugadas a revisar — pulsa una para verla en el tablero',
    evalGraph: 'Evaluación a lo largo de la partida',
    evalGraphLabel:
      'La barra de evaluación durante toda la partida, de la primera jugada a la última: la parte de las blancas en blanco, la de las negras en negro. Pulsa para ir a una jugada.',
    moveQuality: {
      best: 'Mejor',
      excellent: 'Excelente',
      good: 'Buena',
      inaccuracy: 'Imprecisión',
      mistake: 'Error',
      blunder: 'Error grave',
    },
    moveQualityTitles: {
      mistake:
        'Errores: jugadas que cuestan lo que costarían 0.6–2 peones desde una posición igualada, sin llegar a error grave',
      blunder:
        'Errores graves: jugadas que cuestan lo que costarían 2+ peones desde una posición igualada',
    },
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
    someFailed: (analyzed: number, failed: number, total: number) =>
      `${analyzed} de ${total} partidas analizadas — ${failed} no se ${failed === 1 ? 'pudo' : 'pudieron'} guardar.`,
  },
  manualGame: {
    noResult:
      'El PGN no tiene resultado final — añade una cabecera [Result "1-0"], [Result "0-1"] o [Result "1/2-1/2"].',
    missingPlayers: 'Al PGN le faltan las cabeceras de jugadores White/Black.',
    badMovetext: 'No se pudo interpretar este PGN — revisa que las jugadas sean válidas.',
    noMoves: 'El PGN no tiene jugadas — pega la partida completa, no solo sus cabeceras.',
    duplicate: 'Esta partida ya está en Blitzr.',
    notInGame: (username: string) =>
      `Ninguno de los jugadores es ${username} — elige con qué color jugaste, o "No soy yo" para dejarla fuera de tus estadísticas.`,
  },
  sync: {
    button: 'Sincronizar partidas',
    syncing: 'Sincronizando…',
    progress: (done: number, total: number) => `Sincronizando ${done}/${total} meses…`,
    failed: 'Error al sincronizar.',
    rateLimited: 'Chess.com está limitando las peticiones — inténtalo de nuevo en unos minutos.',
    userNotFound: (username: string) => `Chess.com no tiene ningún jugador llamado "${username}".`,
    noUsername:
      'CHESSCOM_USERNAME no está configurado. Copia .env.example a .env.local y rellénalo.',
    synced: (archives: number, games: number) =>
      `${archives} ${archives === 1 ? 'archivo sincronizado' : 'archivos sincronizados'}, ${games} ${games === 1 ? 'partida añadida' : 'partidas añadidas'}.`,
    analyzeNew: 'Analizarlas',
  },
  addPgn: {
    button: 'Añadir partida por PGN',
    title: 'Añadir partida por PGN',
    placeholder: 'Pega el PGN aquí…',
    submit: 'Añadir partida',
    adding: 'Añadiendo…',
    genericError: 'No se pudo añadir esta partida.',
    sideLabel: 'Jugaste con',
    sides: {
      auto: 'Detectar por mi usuario',
      white: 'Blancas',
      black: 'Negras',
      notMine: 'No soy yo (fuera de mis estadísticas)',
    },
  },
  drill: {
    hint: '💡 Pista',
    correct: '¡Correcto!',
    correctWithHelp: 'Correcto, con ayuda — vuelve mañana.',
    notQuite: (moves: string) => `No exactamente — la jugada era ${moves}.`,
    alsoGood: (moves: string) => `También es buena — el motor prefería ${moves}.`,
    checkingMove: 'Comprobando tu jugada…',
    or: 'o',
    next: 'Siguiente',
    findPreparedMove: 'Encuentra tu jugada preparada',
    findBestMove: 'Encuentra la mejor jugada',
    findPunish: 'Tu rival acaba de cometer un error — castígalo',
    findMate: 'Tienes un mate forzado — encuentra la primera jugada',
    cardOf: (index: number, total: number) => `Tarjeta ${index} de ${total}`,
    hintText: (pieces: string) => `Pista: es una jugada de ${pieces}.`,
    keyboardHint: 'Espacio/Intro → Siguiente · H → Pista · U → Deshacer',
    undo: 'Deshacer',
    undoFailed: 'No se pudo deshacer la respuesta.',
    autoAdvance: 'Pasar a la siguiente tarjeta tras acertar',
    saveFailed: (n: number) =>
      n === 1
        ? 'No se pudo guardar una respuesta, así que su tarjeta mantiene su programación anterior.'
        : `No se pudieron guardar ${n} respuestas, así que sus tarjetas mantienen su programación anterior.`,
    retrySave: 'Reintentar',
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
    gapsTitle: 'Dónde tus partidas salen de tu preparación',
    gapsTooltip:
      'Las líneas en las que tus partidas más a menudo siguieron más allá del final de este árbol (o una jugada del rival a la que no tiene respuesta). Haz clic en una para ir a donde iría la siguiente jugada.',
    gapGames: (n: number) => `${n} ${n === 1 ? 'partida' : 'partidas'}`,
  },
  gamesPage: {
    title: 'Partidas',
    searchPlaceholder: 'Buscar por nombre del rival…',
    previous: 'Anterior',
    next: 'Siguiente',
    pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
    allResults: 'Todos los resultados',
    allColors: 'Todos los colores',
    allRated: 'Clasificadas y no clasificadas',
    rated: 'Solo clasificadas',
    unrated: 'Solo no clasificadas',
    anyAccuracy: 'Cualquier precisión',
    accuracyAtLeast: 'Precisión ≥',
    accuracyAtMost: 'Precisión ≤',
    setupUsername:
      'Para empezar, copia .env.example a .env.local, pon tu usuario de Chess.com en CHESSCOM_USERNAME, reinicia Blitzr y haz clic en "Sincronizar partidas".',
    setupAnalyze:
      'Ahora haz clic en "Analizar todas" para encontrar tus errores. Stockfish se ejecuta en esta pestaña del navegador y sigue mientras navegas por otras páginas.',
  },
  blundersPage: {
    title: 'Errores',
    summary: (blunders: number, analyzed: number, total: number) =>
      `${blunders} ${blunders === 1 ? 'error' : 'errores'} en ${analyzed} de ${total} partidas sincronizadas analizadas por Stockfish.`,
  },
  dateRangeFilter: {
    from: 'Desde',
    to: 'Hasta',
    clear: 'Borrar',
    presets: {
      today: 'Hoy',
      last3Days: 'Últimos 3 días',
      lastWeek: 'Última semana',
      last2Weeks: 'Últimas 2 semanas',
    },
  },
  accuracyTrend: {
    title: 'Precisión a lo largo del tiempo',
    caption: (window: number) =>
      `Cada punto es una partida analizada; la línea es tu media móvil de las últimas ${window} partidas.`,
    empty: 'Aún no hay partidas analizadas en este rango.',
    tooltipAverage: (n: number) => `Media de ${n} partidas`,
    showDots: 'Mostrar partidas individuales',
  },
  drillPage: {
    title: 'Entrenar',
  },
  puzzles: {
    toMove: (color: 'white' | 'black') =>
      color === 'white' ? 'Juegan las blancas' : 'Juegan las negras',
    mateIn: (n: number) => `Mate en ${n}`,
    defendMateIn: (n: number) => `Evita el mate en ${n}`,
    defendPrompt: 'Tu rival amenaza mate. Encuentra la jugada que lo evita.',
    allowsMate: 'Eso permite el mate — inténtalo de nuevo.',
    savesLabel: 'Jugadas que evitan el mate',
    inTheGameLabel: 'Lo que pasó en la partida',
    incorrect: 'No exactamente — inténtalo de nuevo.',
    solved: '¡Resuelto!',
    saveFailed:
      'No se pudo guardar tu progreso, así que este problema aparecerá sin resolver al recargar.',
    retrySave: 'Reintentar',
    revealedTitle: 'Solución',
    reveal: 'Ver solución',
    solvedBadge: 'Resuelto',
    rating: (rating: number) => `dificultad ${rating}`,
    viewOnLichess: 'Ver en Lichess',
    choosePromotion: 'Coronar a:',
    movesLabel: 'Jugadas',
  },
  puzzlesPage: {
    title: 'Problemas',
    intro:
      'Problemas de mate forzado — juega tú mismo la línea ganadora completa, o encuentra la jugada que lo evita. Sin pistas ni motor.',
    solvedCount: (solved: number, total: number) => `${solved} de ${total} resueltos`,
    empty: 'Aún no hay problemas cargados.',
    noneMatch: 'Ningún problema coincide con estos filtros.',
    previous: 'Problema anterior',
    next: 'Problema siguiente',
    nextUnsolved: 'Siguiente sin resolver ▶',
    backToList: 'Todos los problemas',
    pagePrevious: 'Anterior',
    pageNext: 'Siguiente',
    pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
    filters: {
      allStatus: 'Todos',
      solvedOnly: 'Resueltos',
      unsolvedOnly: 'Sin resolver',
      allColors: 'Cualquier color',
      allMateIn: 'Cualquier longitud',
      allKinds: 'Dar o evitar mate',
      mateKind: 'Dar mate',
      defendKind: 'Evitar mate',
    },
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
    notMine: 'no es tu partida — fuera de tus estadísticas',
    deleteGame: 'Eliminar partida',
    deleteGameConfirm:
      '¿Eliminar esta partida pegada, su análisis y sus tarjetas de entrenamiento?',
  },
  liveAnalysis: {
    panelTitle: 'Líneas del motor',
    thinking: 'Pensando…',
    yourLine: 'Tu línea:',
    playLine: 'Reproducir esta línea en el tablero',
    lineQueued: 'En cola — recórrela con ◀/▶',
    resetLine: 'Borrar esta línea — volver a donde empezaste a explorar',
  },
  routeStatus: {
    errorTitle: 'Algo salió mal',
    errorBody:
      'No se pudo cargar esta página. Puede ser temporal: Chess.com caído o la base de datos ocupada.',
    retry: 'Reintentar',
    notFoundTitle: 'No encontrado',
    notFoundBody: 'Esta página no existe, o la partida se eliminó.',
    backToGames: 'Volver a las partidas',
    loading: 'Cargando…',
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
