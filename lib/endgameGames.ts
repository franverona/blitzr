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

/** Every set of pieces `game` had, as `w/b` (see `materialKey()`), with the first ply it did. */
export function piecesReached(game: Game): Map<string, number> {
  const reached = new Map<string, number>()
  const record = (fen: string, ply: number) => {
    const { w, b } = materialKey(fen)
    if (!reached.has(`${w}/${b}`)) reached.set(`${w}/${b}`, ply)
  }
  const chess = new Chess(game.initialFen)
  record(chess.fen(), 0)
  for (const [i, san] of (game.movesSan ?? []).entries()) {
    try {
      chess.move(san)
    } catch {
      break
    }
    // Only a capture or a promotion changes material.
    if (san.includes('x') || san.includes('=')) record(chess.fen(), i + 1)
  }
  return reached
}

/** The first ply at which `game` had the same pieces as `fen`, with either color on either side;
 *  null if it never did. `memo` keeps each game's `piecesReached()` across calls. */
export function plyReachingMaterial(
  game: Game,
  fen: string,
  memo: Map<string, Map<string, number>> = new Map(),
): number | null {
  if (!game.movesSan) return null
  const target = materialKey(fen)

  // Replaying is slow (chess.js parses each SAN). Without a promotion, pieces are only ever
  // lost, so a game that ended with more of any piece than the lesson never had its pieces.
  if (game.finalFen && !game.movesSan.some((san) => san.includes('='))) {
    const end = materialKey(game.finalFen)
    const possible =
      (fitsWithin(end.w, target.w) && fitsWithin(end.b, target.b)) ||
      (fitsWithin(end.w, target.b) && fitsWithin(end.b, target.w))
    if (!possible) return null
  }

  // The moves' count too: a refreshed Lichess game can have more of them.
  const key = `${game.id}:${game.movesSan.length}`
  let reached = memo.get(key)
  if (!reached) {
    reached = piecesReached(game)
    memo.set(key, reached)
  }
  const plies = [reached.get(`${target.w}/${target.b}`), reached.get(`${target.b}/${target.w}`)]
  const found = plies.filter((ply) => ply !== undefined)
  return found.length > 0 ? Math.min(...found) : null
}

/** Own games that reached a lesson's pieces, most recent first in `recent`. `memo`: see
 *  `plyReachingMaterial()`. */
export function findGamesReachingMaterial(
  games: Game[],
  fen: string,
  memo: Map<string, Map<string, number>> = new Map(),
): LessonEndgameGames {
  let wins = 0
  let draws = 0
  let losses = 0
  const reached: LessonEndgameGames['recent'] = []
  for (const game of games) {
    const ply = plyReachingMaterial(game, fen, memo)
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
