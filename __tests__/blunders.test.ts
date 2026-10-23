import { describe, expect, it } from 'vitest'
import { buildBlunderStats } from '@/lib/blunders'
import type { Game, GameAnalysis, PositionEval } from '@/lib/types'

function cp(value: number): PositionEval {
  return { cp: value, mate: null, bestMove: null }
}

function mate(n: number): PositionEval {
  return { cp: null, mate: n, bestMove: null }
}

function makeGame(overrides: Partial<Game>): Game {
  return {
    id: Math.random().toString(36).slice(2),
    url: '',
    pgn: '',
    movesSan: [],
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    finalFen: null,
    timeControl: '180',
    timeClass: 'blitz',
    rules: 'chess',
    rated: true,
    endTime: 0,
    whiteUsername: 'me',
    whiteRating: null,
    whiteResult: 'win',
    blackUsername: 'opp',
    blackRating: null,
    blackResult: 'checkmated',
    myColor: 'white',
    myResult: 'win',
    isMine: true,
    ecoCode: 'C50',
    ecoName: 'Italian Game: 3...Bc5',
    ecoUrl: null,
    archiveYm: '2023-11',
    createdAt: '',
    ...overrides,
  }
}

function makeAnalysis(gameId: string, evals: PositionEval[]): GameAnalysis {
  return { gameId, evals, analyzedAt: '' }
}

describe('buildBlunderStats', () => {
  it('groups own blunders by opening family, bucketing a null ECO code as unknown', () => {
    const white = makeGame({
      ecoCode: 'C50',
      ecoName: 'Italian Game: 3...Bc5',
      myColor: 'white',
      movesSan: ['e4', 'e5', 'Qh5??'],
    })
    const black = makeGame({
      ecoCode: null,
      ecoName: null,
      myColor: 'black',
      movesSan: ['e4', 'Nf6??'],
    })
    const analyses = new Map([
      [white.id, makeAnalysis(white.id, [cp(20), cp(30), cp(40), cp(-260)])],
      [black.id, makeAnalysis(black.id, [cp(0), cp(10), cp(250)])],
    ])

    const stats = buildBlunderStats([white, black], analyses)
    expect(stats.totalBlunders).toBe(2)
    expect(stats.byOpening).toEqual(
      expect.arrayContaining([
        { key: 'Italian Game', label: 'Italian Game', count: 1, avgSwingCp: 300 },
        { key: 'Unknown opening', label: 'Unknown opening', count: 1, avgSwingCp: 240 },
      ]),
    )
  })

  it('groups openings by family name across ECO codes', () => {
    const b20 = makeGame({ ecoCode: 'B20', ecoName: 'Sicilian Defense', movesSan: ['e4'] })
    const b90 = makeGame({
      ecoCode: 'B90',
      ecoName: 'Sicilian Defense: Najdorf Variation',
      movesSan: ['e4'],
    })
    const analyses = new Map([
      [b20.id, makeAnalysis(b20.id, [cp(0), cp(-260)])],
      [b90.id, makeAnalysis(b90.id, [cp(0), cp(-260)])],
    ])

    expect(buildBlunderStats([b20, b90], analyses).byOpening).toEqual([
      { key: 'Sicilian Defense', label: 'Sicilian Defense', count: 2, avgSwingCp: 260 },
    ])
  })

  it('excludes mate-sentinel swings from the average but still counts them', () => {
    // Mate swings use a ±100,000 sentinel and must be left out of avgSwingCp.
    const sicilian = { ecoCode: 'B20', ecoName: 'Sicilian Defense' }
    const normal = makeGame({ ...sicilian, movesSan: ['e4'] })
    const intoMate = makeGame({ ...sicilian, movesSan: ['Nc3'] })
    const onlyMate = makeGame({ ecoCode: 'C00', ecoName: 'French Defense', movesSan: ['Nf3'] })
    const analyses = new Map([
      [normal.id, makeAnalysis(normal.id, [cp(0), cp(-260)])],
      [intoMate.id, makeAnalysis(intoMate.id, [cp(50), mate(-3)])],
      [onlyMate.id, makeAnalysis(onlyMate.id, [cp(50), mate(-3)])],
    ])

    const stats = buildBlunderStats([normal, intoMate, onlyMate], analyses)
    const b20 = stats.byOpening.find((g) => g.label === 'Sicilian Defense')
    const c00 = stats.byOpening.find((g) => g.label === 'French Defense')
    expect(b20).toMatchObject({ count: 2, avgSwingCp: 260 })
    expect(c00).toMatchObject({ count: 1, avgSwingCp: null })
  })

  it('groups own blunders by piece, with pawn and castle buckets for moves with no piece letter', () => {
    const queenBlunder = makeGame({ movesSan: ['e4', 'e5', 'Qh5??'] })
    const pawnBlunder = makeGame({ movesSan: ['a4??'] })
    // Castling needs the kingside actually cleared first — an isolated
    // "O-O??" as move 1 isn't legal, so this plays it out for real.
    const castleBlunder = makeGame({
      movesSan: ['Nf3', 'Nc6', 'g3', 'd6', 'Bg2', 'd5', 'O-O??'],
    })
    const analyses = new Map([
      [queenBlunder.id, makeAnalysis(queenBlunder.id, [cp(20), cp(30), cp(40), cp(-260)])],
      [pawnBlunder.id, makeAnalysis(pawnBlunder.id, [cp(0), cp(-260)])],
      [
        castleBlunder.id,
        makeAnalysis(castleBlunder.id, [cp(0), cp(0), cp(0), cp(0), cp(0), cp(0), cp(0), cp(-250)]),
      ],
    ])

    const stats = buildBlunderStats([queenBlunder, pawnBlunder, castleBlunder], analyses)
    const keys = stats.byPiece.map((g) => g.key).sort()
    expect(keys).toEqual(['Q', 'castle', 'pawn'].sort())
  })

  it('groups own blunders by tactical reason, with a bucket for no simple pattern', () => {
    // 2.Ng5?? walks into the d8 queen, with nothing defending it.
    const hanging = makeGame({ id: 'hanging', movesSan: ['Nf3', 'e5', 'Ng5'] })
    const unexplained = makeGame({ id: 'unexplained', movesSan: ['a4'] })
    const analyses = new Map([
      [hanging.id, makeAnalysis(hanging.id, [cp(20), cp(20), cp(20), cp(-300)])],
      [unexplained.id, makeAnalysis(unexplained.id, [cp(0), cp(-260)])],
    ])

    const stats = buildBlunderStats([hanging, unexplained], analyses)
    expect(
      stats.byReason
        .map(({ key, label, count }) => ({ key, label, count }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    ).toEqual([
      { key: 'hanging-piece', label: 'Hanging piece', count: 1 },
      { key: 'none', label: 'No simple pattern', count: 1 },
    ])
    expect(buildBlunderStats([hanging], analyses, 'es').byReason[0].label).toBe('Pieza colgada')
  })

  it('groups own blunders by game phase, in game order', () => {
    const early = makeGame({ id: 'early', movesSan: ['a4'] })
    const analyses = new Map([[early.id, makeAnalysis(early.id, [cp(0), cp(-260)])]])

    const stats = buildBlunderStats([early], analyses)
    expect(stats.byPhase).toEqual([{ key: 'opening', label: 'Opening', count: 1, avgSwingCp: 260 }])
    expect(buildBlunderStats([early], analyses, 'es').byPhase[0].label).toBe('Apertura')
  })

  it('excludes blunders on the opponent’s plies', () => {
    // ply 1 is white (the pawn move, fine); ply 2 is black — but this game's
    // myColor is white, so black's blunder shouldn't count.
    const game = makeGame({ myColor: 'white', movesSan: ['d4', 'Ng8??'] })
    const analyses = new Map([[game.id, makeAnalysis(game.id, [cp(0), cp(10), cp(300)])]])

    const stats = buildBlunderStats([game], analyses)
    expect(stats.totalBlunders).toBe(0)
    expect(stats.worst).toEqual([])
  })

  it('only counts games with a matching analysis toward analyzedGames', () => {
    const analyzed = makeGame({ movesSan: ['e4', 'e5', 'Qh5??'] })
    const notAnalyzed = makeGame({ movesSan: ['e4', 'e5'] })
    const analyses = new Map([
      [analyzed.id, makeAnalysis(analyzed.id, [cp(20), cp(30), cp(40), cp(-260)])],
    ])

    const stats = buildBlunderStats([analyzed, notAnalyzed], analyses)
    expect(stats.totalGames).toBe(2)
    expect(stats.analyzedGames).toBe(1)
  })

  it('attaches a plain-English description to each worst-list entry', () => {
    const game = makeGame({ movesSan: ['e4', 'e5', 'Qh5??'] })
    const analyses = new Map([[game.id, makeAnalysis(game.id, [cp(20), cp(30), cp(40), cp(-260)])]])

    const stats = buildBlunderStats([game], analyses)
    expect(stats.worst[0].moveDescription).toBe('Queen to h5')
  })

  it('translates piece labels and move descriptions when the locale is es', () => {
    const game = makeGame({ ecoCode: null, ecoName: null, movesSan: ['e4', 'e5', 'Qh5??'] })
    const analyses = new Map([[game.id, makeAnalysis(game.id, [cp(20), cp(30), cp(40), cp(-260)])]])

    const stats = buildBlunderStats([game], analyses, 'es')
    expect(stats.byOpening[0].label).toBe('Apertura desconocida')
    expect(stats.byPiece[0].label).toBe('Dama')
    expect(stats.worst[0].moveDescription).toBe('Dama a h5')
  })

  it('sorts the worst list by win-% drop descending and caps it at 10', () => {
    const games = Array.from({ length: 12 }, () => makeGame({ movesSan: ['e4'] }))
    const analyses = new Map(
      games.map((g, i) => [g.id, makeAnalysis(g.id, [cp(0), cp(-(200 + i * 50))])]),
    )

    const stats = buildBlunderStats(games, analyses)
    expect(stats.worst).toHaveLength(10)
    expect(stats.worst[0].swingCp).toBe(750)
    expect(stats.worst[9].swingCp).toBe(300)
  })
})
