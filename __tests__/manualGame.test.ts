import { describe, expect, it } from 'vitest'
import { parseManualGame } from '@/lib/manualGame'

// Exact PGN from issue #62 — a "Play vs Bot" game, the case the public
// Chess.com API never exposes at all.
const BOT_GAME_PGN = `[Event "Play vs Bot"]
[Site "Chess.com"]
[Date "2026.08.10"]
[Round "?"]
[White "Hans"]
[Black "fverona"]
[Result "0-1"]
[BlackElo "400"]
[WhiteElo "1000"]
[Termination "por jaque mate"]
[ECO "C20"]
[EndDate "2026.08.10"]
[Link "https://www.chess.com/game/computer/1917991614"]

1. e4 e5 2. g3 d5 3. h4 Nf6 4. Qe2 c6 5. exd5 Nxd5 6. Qxe5+ Be6 7. Bc4 f6 8.
Qxe6+ Be7 9. Bxd5 cxd5 10. Kd1 d4 11. Qe2 Qd5 12. h5 Qxh1 13. Qb5+ Nc6 14. Qc4
O-O-O 15. Qe6+ Kc7 16. Qe1 Qxh5+ 17. f3 Ne5 18. Qe4 Bc5 19. Na3 Rhe8 20. d3 Qh1
21. Nb5+ Kb8 22. Bf4 Qxg1+ 23. Ke2 Qxa1 24. Bxe5+ Rxe5 25. g4 Qxb2 26. Nxa7 Kxa7
27. a3 Qxc2+ 28. Kf1 Bxa3 29. Qxh7 Re7 30. Qh1 Qb1+ 31. Kg2 Re1 32. Qh7 Rg1+ 33.
Kh3 Rh1+ 34. Kg3 Rxh7 35. Kf2 Qb2+ 36. Kg1 Rh2 37. g5 Qg2# 0-1`

describe('parseManualGame', () => {
  it('parses the issue #62 example end-to-end', () => {
    const game = parseManualGame(BOT_GAME_PGN, 'fverona')
    expect(game.myColor).toBe('black')
    expect(game.myResult).toBe('win')
    expect(game.whiteUsername).toBe('Hans')
    expect(game.blackUsername).toBe('fverona')
    expect(game.whiteRating).toBe(1000)
    expect(game.blackRating).toBe(400)
    expect(game.ecoCode).toBe('C20')
    expect(game.url).toBe('https://www.chess.com/game/computer/1917991614')
    expect(game.movesSan?.[0]).toBe('e4')
    expect(game.movesSan?.length).toBe(74)
    expect(game.archiveYm).toBe('manual')
  })

  it('matches the username case-insensitively against either color', () => {
    const game = parseManualGame(BOT_GAME_PGN, 'FVERONA')
    expect(game.myColor).toBe('black')
  })

  it('defaults to white when neither header matches the configured username', () => {
    const game = parseManualGame(BOT_GAME_PGN, 'someone-else')
    expect(game.myColor).toBe('white')
  })

  it('generates a fresh id per call, never colliding with a real sync', () => {
    const a = parseManualGame(BOT_GAME_PGN, 'fverona')
    const b = parseManualGame(BOT_GAME_PGN, 'fverona')
    expect(a.id).not.toBe(b.id)
  })

  it('falls back gracefully when optional headers are missing', () => {
    const pgn = '[White "A"]\n[Black "B"]\n[Result "1/2-1/2"]\n\n1. e4 e5 *'
    const game = parseManualGame(pgn, 'someone-else')
    expect(game.whiteRating).toBeNull()
    expect(game.blackRating).toBeNull()
    expect(game.ecoCode).toBeNull()
    expect(game.url).toBe('')
    expect(game.myResult).toBe('draw')
  })

  it('throws for PGN missing White/Black headers', () => {
    expect(() => parseManualGame('1. e4 e5 *', 'fverona')).toThrow()
  })

  it('throws for unparseable movetext', () => {
    const pgn = '[White "A"]\n[Black "B"]\n\n1. e4 P@e5 *'
    expect(() => parseManualGame(pgn, 'fverona')).toThrow()
  })

  it('stamps the header date with the current time-of-day, not midnight', () => {
    const game = parseManualGame(BOT_GAME_PGN, 'fverona')
    const headerMidnightUtcSec = Date.UTC(2026, 7, 10) / 1000
    const nowSec = Math.floor(Date.now() / 1000)
    // Same calendar day as the header, but not stuck at exactly midnight —
    // and never later than "now".
    expect(game.endTime).toBeGreaterThanOrEqual(headerMidnightUtcSec)
    expect(game.endTime).toBeLessThan(headerMidnightUtcSec + 86_400)
    expect(game.endTime).toBeLessThanOrEqual(nowSec)
  })
})
