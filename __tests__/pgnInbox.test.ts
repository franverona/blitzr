import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listInboxFiles, splitPgnGames } from '@/lib/pgnInbox'

const game = (white: string, black: string) =>
  `[Event "Play vs Coach"]\n[Site "Chess.com"]\n[White "${white}"]\n[Black "${black}"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0\n`

describe('splitPgnGames', () => {
  it('splits a multi-game export into one PGN per game', () => {
    const games = splitPgnGames(`${game('a', 'b')}\n${game('c', 'd')}\n`)
    expect(games).toHaveLength(2)
    expect(games[0]).toMatch(/^\[Event[\s\S]*\[White "a"\][\s\S]*Qxf7# 1-0$/)
    expect(games[1]).toMatch(/^\[Event[\s\S]*\[White "c"\]/)
  })

  it('handles CRLF line endings and blank files', () => {
    expect(
      splitPgnGames(`${game('a', 'b')}\n${game('c', 'd')}`.replace(/\n/g, '\r\n')),
    ).toHaveLength(2)
    expect(splitPgnGames('\n\n')).toEqual([])
  })
})

describe('listInboxFiles', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('lists only Chess.com exports, and nothing when unset', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blitzr-inbox-'))
    for (const name of ['chess_com_games_2026-11-20.pgn', 'other.pgn', 'chess_com_games_x.txt'])
      fs.writeFileSync(path.join(dir, name), '')
    vi.stubEnv('BLITZR_PGN_INBOX', dir)
    expect(await listInboxFiles()).toEqual([path.join(dir, 'chess_com_games_2026-11-20.pgn')])
    vi.stubEnv('BLITZR_PGN_INBOX', '')
    expect(await listInboxFiles()).toEqual([])
    fs.rmSync(dir, { recursive: true })
  })
})
