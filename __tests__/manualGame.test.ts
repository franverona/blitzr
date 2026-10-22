import { describe, expect, it, vi } from 'vitest'
import { findDuplicateGame, parseManualGame } from '@/lib/manualGame'

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

  it('rejects auto-detection when neither header matches the configured username', () => {
    expect(() => parseManualGame(BOT_GAME_PGN, 'someone-else')).toThrow(/Neither player/)
  })

  it('uses an explicit side over the username match', () => {
    const game = parseManualGame(BOT_GAME_PGN, 'someone-else', 'black')
    expect(game).toMatchObject({ myColor: 'black', myResult: 'win', isMine: true })
  })

  it('stores a "not me" game from White\'s side, flagged as not mine', () => {
    const game = parseManualGame(BOT_GAME_PGN, 'fverona', 'notMine')
    expect(game).toMatchObject({ myColor: 'white', myResult: 'loss', isMine: false })
  })

  it('generates a fresh id per call, never colliding with a real sync', () => {
    const a = parseManualGame(BOT_GAME_PGN, 'fverona')
    const b = parseManualGame(BOT_GAME_PGN, 'fverona')
    expect(a.id).not.toBe(b.id)
  })

  it('falls back gracefully when optional headers are missing', () => {
    const pgn = '[White "A"]\n[Black "B"]\n[Result "1/2-1/2"]\n\n1. e4 e5 *'
    const game = parseManualGame(pgn, 'someone-else', 'white')
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

  it('reads the result off the final position when the Result header is "*"', () => {
    const mated = '[White "A"]\n[Black "B"]\n[Result "*"]\n\n1. f3 e5 2. g4 Qh4# *'
    const game = parseManualGame(mated, 'A')
    expect(game.myResult).toBe('loss')
    expect(game.blackResult).toBe('win')
  })

  it('stores Chess.com-style result codes from the position and Termination header', () => {
    expect(parseManualGame(BOT_GAME_PGN, 'fverona')).toMatchObject({
      whiteResult: 'checkmated',
      blackResult: 'win',
    })
    const pgn = (result: string, termination: string) =>
      `[White "A"]\n[Black "B"]\n[Result "${result}"]\n[Termination "${termination}"]\n\n1. e4 e5 ${result}`
    expect(parseManualGame(pgn('1-0', 'A won by resignation'), 'A').blackResult).toBe('resigned')
    expect(parseManualGame(pgn('0-1', 'B won on time'), 'A').whiteResult).toBe('timeout')
    expect(parseManualGame(pgn('0-1', 'B ha ganado por abandono'), 'A').whiteResult).toBe(
      'resigned',
    )
    expect(parseManualGame(pgn('0-1', 'B won - game abandoned'), 'A').whiteResult).toBe('abandoned')
    expect(parseManualGame(pgn('0-1', 'Time forfeit'), 'A').whiteResult).toBe('timeout')
    expect(parseManualGame(pgn('1/2-1/2', 'Game drawn by agreement'), 'A').whiteResult).toBe(
      'agreed',
    )
    expect(
      parseManualGame(pgn('1/2-1/2', 'Game drawn by timeout vs insufficient material'), 'A')
        .blackResult,
    ).toBe('timevsinsufficient')
    expect(parseManualGame(pgn('1-0', 'Normal'), 'A').blackResult).toBe('loss')
    expect(parseManualGame(pgn('1/2-1/2', 'Normal'), 'A').whiteResult).toBe('draw')
  })

  it('stores a Variant header as the rules, so engine and opening features skip it', () => {
    const pgn = (variant: string) =>
      `[White "A"]\n[Black "B"]\n[Result "1-0"]\n[Variant "${variant}"]\n\n1. e4 e5 1-0`
    expect(parseManualGame(pgn('Chess960'), 'A').rules).toBe('chess960')
    expect(parseManualGame(pgn('King of the Hill'), 'A').rules).toBe('kingofthehill')
    expect(parseManualGame(pgn('Standard'), 'A').rules).toBe('chess')
    expect(parseManualGame(pgn('From Position'), 'A').rules).toBe('chess')
    expect(parseManualGame(BOT_GAME_PGN, 'fverona').rules).toBe('chess')
  })

  it('rejects an unfinished game with no result instead of scoring it a White loss', () => {
    const pgn = '[White "A"]\n[Black "B"]\n[Result "*"]\n\n1. e4 e5 *'
    expect(() => parseManualGame(pgn, 'A')).toThrow(/no final result/)
    const noHeader = '[White "A"]\n[Black "B"]\n\n1. e4 e5'
    expect(() => parseManualGame(noHeader, 'A')).toThrow(/no final result/)
  })

  it('rejects a PGN with headers but no moves', () => {
    const pgn = '[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1-0'
    expect(() => parseManualGame(pgn, 'A')).toThrow(/no moves/)
  })

  it('localizes its error messages', () => {
    vi.stubEnv('NEXT_PUBLIC_LOCALE', 'es')
    try {
      const pgn = '[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1-0'
      expect(() => parseManualGame(pgn, 'A')).toThrow(/no tiene jugadas/)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('findDuplicateGame', () => {
  const pasted = parseManualGame(BOT_GAME_PGN, 'fverona')

  it('matches the same Chess.com game whatever the URL form', () => {
    const synced = {
      ...pasted,
      id: 'synced',
      movesSan: ['e4'],
      url: 'https://www.chess.com/analysis/game/computer/1917991614/analysis?move=0',
    }
    expect(findDuplicateGame(pasted, [synced])).toBe(synced)
  })

  it('matches the same players and moves without a link', () => {
    const again = { ...pasted, id: 'again', url: '' }
    expect(findDuplicateGame({ ...pasted, url: '' }, [again])).toBe(again)
  })

  it('tells different games apart', () => {
    const other = {
      ...pasted,
      id: 'other',
      movesSan: ['d4'],
      url: 'https://www.chess.com/game/computer/1',
    }
    expect(findDuplicateGame(pasted, [other])).toBeUndefined()
  })
})
