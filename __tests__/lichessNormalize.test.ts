import { describe, expect, it } from 'vitest'
import type { LichessGame } from '@/lib/lichess/client'
import { isOngoing, normalizeLichessGame } from '@/lib/lichess/normalize'

// The user's real game, as the export's `pgn` field gives it.
const PGN = `[Event "casual correspondence game"]
[Site "https://lichess.org/game/Iz4SK2xE"]
[Date "2026.11.06"]
[White "lichess AI level 2"]
[Black "franverona"]
[Result "0-1"]
[WhiteElo "?"]
[BlackElo "1500"]
[Variant "Standard"]
[ECO "C42"]
[Opening "Petrov's Defense: Damiano Variation"]
[Termination "Normal"]

1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nxe4 4. Qe2 d5 5. d3 Nc5 6. Nxf7+ Kxf7 7. Qf3+ Kg8 8. d4 Ne6 9. c3 Nc6 10. h4 h6 11. Nd2 b6 12. b4 Ne7 13. g3 Ng6 14. Bh3 Qe7 15. Qf5 Kh7 16. Nf3 Nd8+ 17. Kf1 Bxf5 18. Ne5 Bxh3+ 19. Kg1 Bd7 20. Nxg6 Kxg6 21. Bb2 Qe4 22. Rf1 Bd6 23. Rh2 Rf8 24. Rh1 h5 25. Rd1 Qe2 26. Rh2 Qxd1+ 27. Kg2 Qf3+ 28. Kf1 Bxg3 29. Ke1 Bxh2 30. Bc1 Qxf2+ 31. Kd1 Bg4# 0-1`

const SHORT = (result: string) => `[Site "https://lichess.org/Short123"]
[White "franverona"]
[Black "them"]
[Result "${result}"]

1. e4 e5 2. Nf3 Nc6 ${result}`

function raw(overrides: Partial<LichessGame>): LichessGame {
  return {
    id: 'Iz4SK2xE',
    rated: false,
    variant: 'standard',
    speed: 'correspondence',
    createdAt: 1793964759126,
    lastMoveAt: 1793965212256,
    status: 'mate',
    winner: 'black',
    pgn: PGN,
    ...overrides,
  }
}

describe('normalizeLichessGame', () => {
  it('builds the game from its PGN, with the export fields on top', () => {
    const game = normalizeLichessGame(raw({}), 'franverona', 'lichess:2026-11')!
    expect(game).toMatchObject({
      id: 'lichess:Iz4SK2xE',
      site: 'lichess',
      url: 'https://lichess.org/Iz4SK2xE',
      timeClass: 'correspondence',
      rated: false,
      endTime: 1793965212,
      myColor: 'black',
      myResult: 'win',
      whiteResult: 'checkmated',
      blackResult: 'win',
      ecoName: "Petrov's Defense: Damiano Variation",
      archiveYm: 'lichess:2026-11',
    })
  })

  it('reads resignations, flags and abandons from the status', () => {
    const resign = raw({ pgn: SHORT('0-1'), status: 'resign', winner: 'black' })
    expect(normalizeLichessGame(resign, 'franverona', 'k')?.whiteResult).toBe('resigned')
    const flag = raw({ pgn: SHORT('1-0'), status: 'outoftime', winner: 'white' })
    expect(normalizeLichessGame(flag, 'franverona', 'k')?.blackResult).toBe('timeout')
    const left = raw({ pgn: SHORT('1-0'), status: 'timeout', winner: 'white' })
    expect(normalizeLichessGame(left, 'franverona', 'k')?.blackResult).toBe('abandoned')
  })

  it('tells agreed draws from flags against insufficient material', () => {
    const agreed = raw({ pgn: SHORT('1/2-1/2'), status: 'draw', winner: undefined })
    expect(normalizeLichessGame(agreed, 'franverona', 'k')?.whiteResult).toBe('agreed')
    const flag = raw({ pgn: SHORT('1/2-1/2'), status: 'outoftime', winner: undefined })
    expect(normalizeLichessGame(flag, 'franverona', 'k')?.blackResult).toBe('timevsinsufficient')
  })

  it('maps speeds and clocks to Chess.com-style time classes and controls', () => {
    const game = normalizeLichessGame(
      raw({ speed: 'ultraBullet', clock: { initial: 15, increment: 0 }, rated: true }),
      'franverona',
      'k',
    )
    expect(game).toMatchObject({ timeClass: 'bullet', timeControl: '15+0', rated: true })
  })

  it("skips games that aren't over, were aborted, or can't be replayed", () => {
    expect(isOngoing(raw({ status: 'started' }))).toBe(true)
    expect(normalizeLichessGame(raw({ status: 'started' }), 'franverona', 'k')).toBeNull()
    expect(normalizeLichessGame(raw({ status: 'aborted' }), 'franverona', 'k')).toBeNull()
    // Horde: White has no king, which chess.js refuses.
    const horde = `[Site "https://lichess.org/ZCqzAso8"]
[White "franverona"]
[Black "lichess AI level 2"]
[Result "1-0"]
[Variant "Horde"]
[SetUp "1"]
[FEN "rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1"]

1. e5 1-0`
    expect(
      normalizeLichessGame(raw({ pgn: horde, variant: 'horde' }), 'franverona', 'k'),
    ).toBeNull()
  })
})
