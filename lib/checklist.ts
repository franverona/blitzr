import type { Color, PieceSymbol, Square } from 'chess.js'
import { getLocale } from './i18n/locale'
import type { Locale } from './i18n/locale'
import { hangingSquares } from './hangingPiece'
import { PIECE_VALUES } from './material'
import { pieceWithArticle } from './san'
import { forkers, pinnedPieces, skewers, targetList } from './tactics'
import type { BlunderReason, ChecklistFinding, MyColor } from './types'

function toColor(color: MyColor): Color {
  return color === 'white' ? 'w' : 'b'
}

// Every other always-visible line on the game page (material diff, eval,
// better-move hint) is a single line — an uncapped dump of every hanging
// piece/fork/pin/skewer in a busy middlegame would bury the point for
// someone who's already stuck and doesn't need more noise.
const MAX_FINDINGS_PER_SIDE = 3

function severity(reason: BlunderReason): number {
  if (reason.kind === 'hanging-piece') return PIECE_VALUES[reason.piece as PieceSymbol] ?? 0
  if (reason.kind === 'fork') {
    return Math.max(...reason.targets.map((t) => PIECE_VALUES[t.piece as PieceSymbol] ?? 0))
  }
  if (reason.kind === 'skewer') return PIECE_VALUES[reason.backPiece as PieceSymbol] ?? 0
  return PIECE_VALUES[reason.pinnedPiece as PieceSymbol] ?? 0
}

/** Every hanging piece, fork, pin, and skewer currently threatening one
 *  side's pieces, most valuable first, capped to `MAX_FINDINGS_PER_SIDE`. A
 *  hanging-piece finding is skipped when that square is already a
 *  fork/skewer target for this side — the fork/skewer already explains
 *  *why* the piece is in danger, so repeating the weaker "it's hanging"
 *  note on the same square is just noise. (Pin overlaps are not
 *  suppressed — a piece that's both pinned and genuinely hanging is a
 *  materially different, still-urgent fact.) */
function buildSideFindings(fen: string, side: MyColor): ChecklistFinding[] {
  const color = toColor(side)
  const opponentColor = toColor(side === 'white' ? 'black' : 'white')

  const forks = forkers(fen, opponentColor)
  const sideSkewers = skewers(fen, opponentColor)
  const explainedSquares = new Set<Square>([
    ...forks.flatMap((f) => f.targets.map((t) => t.square)),
    ...sideSkewers.flatMap((s) => [s.frontSquare, s.backSquare]),
  ])

  const findings: ChecklistFinding[] = []

  for (const [square, piece] of hangingSquares(fen, color)) {
    if (explainedSquares.has(square)) continue
    findings.push({ side, reason: { kind: 'hanging-piece', piece, square } })
  }
  for (const f of forks) {
    findings.push({
      side,
      reason: {
        kind: 'fork',
        attackerPiece: f.piece,
        attackerSquare: f.square,
        targets: f.targets.map((t) => ({ piece: t.piece, square: t.square })),
      },
    })
  }
  for (const s of sideSkewers) {
    findings.push({
      side,
      reason: {
        kind: 'skewer',
        attackerPiece: s.attackerPiece,
        attackerSquare: s.attackerSquare,
        frontPiece: s.frontPiece,
        frontSquare: s.frontSquare,
        backPiece: s.backPiece,
        backSquare: s.backSquare,
      },
    })
  }
  for (const p of pinnedPieces(fen, color)) {
    findings.push({
      side,
      reason: {
        kind: 'pin',
        pinnedPiece: p.pinnedPiece,
        pinnedSquare: p.pinnedSquare,
        pinnerPiece: p.pinnerPiece,
        pinnerSquare: p.pinnerSquare,
      },
    })
  }

  return findings
    .sort((a, b) => severity(b.reason) - severity(a.reason))
    .slice(0, MAX_FINDINGS_PER_SIDE)
}

/**
 * Every currently-present tactical pattern for both sides, white then
 * black — unlike `detectHangingPiece()`/`detectFork()`/`detectPin()`/
 * `detectSkewer()` (`lib/hangingPiece.ts`/`lib/tactics.ts`, which diff a
 * move's before/after FEN for what became *newly* true), this scans one
 * static position directly, so stepping through any game — not just a move
 * Stockfish already flagged — can answer "what's actually going on right
 * now" for a beginner who doesn't know what to look for next.
 */
export function buildPositionChecklist(fen: string): ChecklistFinding[] {
  return [...buildSideFindings(fen, 'white'), ...buildSideFindings(fen, 'black')]
}

/**
 * Plain-English/Spanish sentence for one checklist finding — deliberately
 * separate from `describeBlunderReason()` (`lib/tactics.ts`): that
 * function's templates ("This leaves the queen on d5 hanging") read
 * naturally right after a move that caused the pattern, but a checklist
 * describes whatever's already true about the *current* position,
 * unconnected to any specific move — so each template here leads with the
 * piece/attacker as the sentence subject instead. The pin template uses a
 * plain verb ("pins"/"clava") rather than a gendered past-participle
 * adjective, same trick `describePinReason`/`describeSkewerReason` already
 * rely on, to sidestep the torre/dama-vs-everything-else gender-agreement
 * problem an adjective form would introduce.
 */
export function describeChecklistFinding(
  finding: ChecklistFinding,
  locale: Locale = getLocale(),
): string {
  const { reason } = finding
  const es = locale === 'es'
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  if (reason.kind === 'hanging-piece') {
    const piece = capitalize(pieceWithArticle(reason.piece as PieceSymbol, locale))
    return es
      ? `${piece} en ${reason.square} está colgando — se puede capturar gratis.`
      : `${piece} on ${reason.square} is hanging — it can be captured for free.`
  }

  if (reason.kind === 'fork') {
    const attacker = capitalize(pieceWithArticle(reason.attackerPiece as PieceSymbol, locale))
    const targets = targetList(reason.targets, locale)
    return es
      ? `${attacker} en ${reason.attackerSquare} ataca ${targets} a la vez.`
      : `${attacker} on ${reason.attackerSquare} attacks ${targets} at once.`
  }

  if (reason.kind === 'skewer') {
    const attacker = capitalize(pieceWithArticle(reason.attackerPiece as PieceSymbol, locale))
    const front = pieceWithArticle(reason.frontPiece as PieceSymbol, locale)
    const back = pieceWithArticle(reason.backPiece as PieceSymbol, locale)
    return es
      ? `${attacker} en ${reason.attackerSquare} enfila ${front} en ${reason.frontSquare}, con ${back} detrás en ${reason.backSquare}.`
      : `${attacker} on ${reason.attackerSquare} skewers ${front} on ${reason.frontSquare}, with ${back} behind it on ${reason.backSquare}.`
  }

  const pinner = capitalize(pieceWithArticle(reason.pinnerPiece as PieceSymbol, locale))
  const pinned = pieceWithArticle(reason.pinnedPiece as PieceSymbol, locale)
  return es
    ? `${pinner} en ${reason.pinnerSquare} clava ${pinned} en ${reason.pinnedSquare} al rey.`
    : `${pinner} on ${reason.pinnerSquare} pins ${pinned} on ${reason.pinnedSquare} to the king.`
}
