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

const MAX_FINDINGS_PER_SIDE = 3

function severity(reason: BlunderReason): number {
  if (reason.kind === 'hanging-piece') return PIECE_VALUES[reason.piece as PieceSymbol] ?? 0
  if (reason.kind === 'fork') {
    return Math.max(...reason.targets.map((t) => PIECE_VALUES[t.piece as PieceSymbol] ?? 0))
  }
  if (reason.kind === 'skewer') return PIECE_VALUES[reason.backPiece as PieceSymbol] ?? 0
  return PIECE_VALUES[reason.pinnedPiece as PieceSymbol] ?? 0
}

/** Threats against one side, most valuable first. A hanging piece already
 *  targeted by a fork/skewer is skipped (pins are not). */
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

/** Tactical patterns present in a static position, both sides — unlike the
 *  `detect*()` functions, which diff a move's before/after FEN. */
export function buildPositionChecklist(fen: string): ChecklistFinding[] {
  return [...buildSideFindings(fen, 'white'), ...buildSideFindings(fen, 'black')]
}

/** Subject-led wording ("The queen on d5 is hanging"), since a checklist
 *  isn't tied to a move like `describeBlunderReason()` is. */
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

/** Stable across re-renders (findings get re-sorted), so hide toggles persist. */
export function findingKey(finding: ChecklistFinding): string {
  const { side, reason } = finding
  if (reason.kind === 'hanging-piece') return `${side}-hanging-${reason.square}`
  if (reason.kind === 'fork') return `${side}-fork-${reason.attackerSquare}`
  if (reason.kind === 'skewer')
    return `${side}-skewer-${reason.attackerSquare}-${reason.backSquare}`
  return `${side}-pin-${reason.pinnedSquare}`
}

export interface FindingMarks {
  squares: string[]
  arrows: [string, string][]
}

export function findingMarks(reason: BlunderReason): FindingMarks {
  if (reason.kind === 'hanging-piece') {
    // No attacker square is tracked for a hanging piece.
    return { squares: [reason.square], arrows: [] }
  }
  if (reason.kind === 'fork') {
    return {
      squares: [reason.attackerSquare, ...reason.targets.map((t) => t.square)],
      arrows: reason.targets.map((t): [string, string] => [reason.attackerSquare, t.square]),
    }
  }
  if (reason.kind === 'skewer') {
    return {
      squares: [reason.attackerSquare, reason.frontSquare, reason.backSquare],
      arrows: [[reason.attackerSquare, reason.backSquare]],
    }
  }
  return {
    squares: [reason.pinnerSquare, reason.pinnedSquare],
    arrows: [[reason.pinnerSquare, reason.pinnedSquare]],
  }
}
