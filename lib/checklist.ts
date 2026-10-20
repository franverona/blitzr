import type { Color, PieceSymbol, Square } from 'chess.js'
import { hangingReason, hangingSquares } from './hangingPiece'
import { PIECE_VALUES } from './material'
import { forkers, pinnedPieces, skewers } from './tactics'
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

  for (const [square, hanging] of hangingSquares(fen, color)) {
    if (explainedSquares.has(square)) continue
    findings.push({ side, reason: hangingReason(square, hanging) })
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

export interface FindingMarks {
  squares: string[]
  arrows: [string, string][]
}

export function findingMarks(reason: BlunderReason): FindingMarks {
  if (reason.kind === 'hanging-piece') {
    // An undefended piece has no single attacker worth drawing; a cheaper one does.
    if (!reason.attacker) return { squares: [reason.square], arrows: [] }
    return {
      squares: [reason.attacker.square, reason.square],
      arrows: [[reason.attacker.square, reason.square]],
    }
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
