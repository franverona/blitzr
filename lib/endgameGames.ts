import { Chess } from 'chess.js'
import type { Game, LessonEndgameGames } from './types'

// Keeps the line above the board to one line, as the board's height cap assumes.
const RECENT_LIMIT = 3

const PIECE_ORDER = 'QRBN'

/** Each side's pieces, e.g. `{ w: 'RB', b: 'R' }`: kings, pawns and bishop square colors are
 *  ignored, so a lesson matches its kind of ending (rook vs rook, any pawns). */
export function materialKey(fen: string): { w: string; b: string } {
  const placement = fen.split(' ')[0]
  const side = (letters: string) =>
    [...letters].sort((a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b)).join('')
  return {
    w: side(placement.replace(/[^QRBN]/g, '')),
    b: side(placement.replace(/[^qrbn]/g, '').toUpperCase()),
  }
}

/** No more of any piece in `have` than in `limit`. */
function fitsWithin(have: string, limit: string): boolean {
  const count = (pieces: string, piece: string) => pieces.split(piece).length - 1
  return [...PIECE_ORDER].every((piece) => count(have, piece) <= count(limit, piece))
}

/** The first ply at which `game` had the same pieces as `fen`, with either color on either side;
 *  null if it never did. */
export function plyReachingMaterial(game: Game, fen: string): number | null {
  if (!game.movesSan) return null
  const target = materialKey(fen)
  const matches = (key: { w: string; b: string }) =>
    (key.w === target.w && key.b === target.b) || (key.w === target.b && key.b === target.w)

  // Replaying is slow (chess.js parses each SAN). Without a promotion, pieces are only ever
  // lost, so a game that ended with more of any piece than the lesson never had its pieces.
  if (game.finalFen && !game.movesSan.some((san) => san.includes('='))) {
    const end = materialKey(game.finalFen)
    const possible =
      (fitsWithin(end.w, target.w) && fitsWithin(end.b, target.b)) ||
      (fitsWithin(end.w, target.b) && fitsWithin(end.b, target.w))
    if (!possible) return null
  }

  const chess = new Chess(game.initialFen)
  if (matches(materialKey(chess.fen()))) return 0
  for (let i = 0; i < game.movesSan.length; i++) {
    const san = game.movesSan[i]
    try {
      chess.move(san)
    } catch {
      return null
    }
    // Only a capture or a promotion changes material.
    if ((san.includes('x') || san.includes('=')) && matches(materialKey(chess.fen()))) return i + 1
  }
  return null
}

/** Own games that reached a lesson's pieces, most recent first in `recent`. `memo` keeps each
 *  game's answer across calls, since replaying every game is slow. */
export function findGamesReachingMaterial(
  games: Game[],
  fen: string,
  memo: Map<string, number | null> = new Map(),
): LessonEndgameGames {
  const { w, b } = materialKey(fen)
  // The moves' count too: a refreshed Lichess game can have more of them.
  const memoKey = (game: Game) => `${game.id}:${game.movesSan?.length}:${[w, b].sort().join('/')}`
  let wins = 0
  let draws = 0
  let losses = 0
  const reached: LessonEndgameGames['recent'] = []
  for (const game of games) {
    const key = memoKey(game)
    let ply = memo.get(key)
    if (ply === undefined) {
      ply = plyReachingMaterial(game, fen)
      memo.set(key, ply)
    }
    if (ply === null) continue
    if (game.myResult === 'win') wins++
    else if (game.myResult === 'draw') draws++
    else losses++
    const opponentIsWhite = game.myColor === 'black'
    reached.push({
      gameId: game.id,
      ply,
      opponent: opponentIsWhite ? game.whiteUsername : game.blackUsername,
      endTime: game.endTime,
      myResult: game.myResult,
    })
  }
  reached.sort((a, b) => b.endTime - a.endTime)
  return {
    games: wins + draws + losses,
    wins,
    draws,
    losses,
    recent: reached.slice(0, RECENT_LIMIT),
  }
}
