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
        { key: 'C50', label: 'Italian Game', count: 1, avgSwingCp: 300 },
        { key: 'unknown', label: 'Unknown opening', count: 1, avgSwingCp: 240 },
      ]),
    )
  })

  it('excludes mate-sentinel swings from the average but still counts them', () => {
    // evalToCp maps a mate score to an internal ±100,000 sentinel (see
    // lib/analysis.ts) — mixing that into a pawns average would produce a
    // nonsense "985 pawns" figure, so avgSwingCp must skip it.
    const normal = makeGame({ ecoCode: 'B20', movesSan: ['e4'] })
    const intoMate = makeGame({ ecoCode: 'B20', movesSan: ['Nc3'] })
    const onlyMate = makeGame({ ecoCode: 'C00', movesSan: ['Nf3'] })
    const analyses = new Map([
      [normal.id, makeAnalysis(normal.id, [cp(0), cp(-260)])],
      [intoMate.id, makeAnalysis(intoMate.id, [cp(50), mate(-3)])],
      [onlyMate.id, makeAnalysis(onlyMate.id, [cp(50), mate(-3)])],
    ])

    const stats = buildBlunderStats([normal, intoMate, onlyMate], analyses)
    const b20 = stats.byOpening.find((g) => g.key === 'B20')
    const c00 = stats.byOpening.find((g) => g.key === 'C00')
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

  it('sorts the worst list by swing descending and caps it at 10', () => {
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
