'use client'

import { Fragment, useEffect, useMemo, useRef } from 'react'
import { findBlunders, formatEval, formatSwing } from '@/lib/analysis'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { summarizeMoveQuality } from '@/lib/moveQuality'
import { describeMove } from '@/lib/san'
import { describeBetterMove, describeBlunderReason, detectBlunderReason } from '@/lib/tactics'
import type { Blunder, MyColor, PositionEval } from '@/lib/types'
import { MoveQualityBadge, type BadMoveTier } from './MoveQualityBadge'
import { MoveSequence } from './MoveSequence'
import { PieceMoveLabel } from './PieceMoveLabel'
import { PlanBoardButton } from './PlanBoard'

interface MoveEntry {
  san: string
  ply: number
}

interface MovePair {
  moveNumber: number
  white?: MoveEntry
  black?: MoveEntry
}

function buildMovePairs(movesSan: string[]): MovePair[] {
  const pairs: MovePair[] = []
  movesSan.forEach((san, i) => {
    const ply = i + 1
    if (i % 2 === 0) {
      pairs.push({ moveNumber: Math.floor(i / 2) + 1, white: { san, ply } })
    } else {
      pairs[pairs.length - 1].black = { san, ply }
    }
  })
  return pairs
}

/** Detail shown under a selected blunder ply. */
function BlunderDetail({
  blunder,
  tier,
  fenBefore,
  fenAfter,
  myColor,
}: {
  blunder: Blunder
  tier: BadMoveTier
  fenBefore: string
  fenAfter: string
  myColor: MyColor
}) {
  const s = getStrings()
  const reason = detectBlunderReason(fenBefore, fenAfter, myColor)
  const bestMove = blunder.evalBefore.bestMove
  // The dialog title keeps the plan sentence; the inline text drops it since
  // MoveSequence below already shows the line.
  const betterMove = describeBetterMove(fenBefore, blunder.moveSan, bestMove, myColor)
  const betterMoveHead = bestMove
    ? describeBetterMove(fenBefore, blunder.moveSan, { ...bestMove, bestLine: [] }, myColor)
    : null

  return (
    <li className="bg-accent/10 flex flex-col gap-3 border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <MoveQualityBadge tier={tier} />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatEval(blunder.evalBefore)} → {formatEval(blunder.evalAfter)} ({formatSwing(blunder)}
          )
        </span>
      </div>
      <div className="text-sm text-zinc-700 dark:text-zinc-300">
        {describeMove(fenBefore, blunder.moveSan)}
      </div>
      {reason && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {describeBlunderReason(reason)}
        </div>
      )}
      {betterMoveHead && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {s.common.betterWas} {betterMoveHead}
          {bestMove && bestMove.bestLine?.length > 0 && (
            <PlanBoardButton
              betterMove={betterMove ?? betterMoveHead}
              fenBefore={fenBefore}
              moves={[bestMove.san, ...bestMove.bestLine]}
              boardOrientation={myColor}
            />
          )}
        </div>
      )}
      {bestMove && bestMove.bestLine?.length > 0 && (
        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          <MoveSequence fen={fenBefore} moves={[bestMove.san, ...bestMove.bestLine]} />
        </div>
      )}
    </li>
  )
}

export function MoveList({
  movesSan,
  ply,
  onSelect,
  result,
  evals,
  positions,
  myColor,
}: {
  movesSan: string[]
  ply: number
  onSelect: (ply: number) => void
  result?: string
  /** Saved analysis; drives the inline blunder badges. */
  evals?: PositionEval[]
  /** FEN before each ply. */
  positions: string[]
  myColor: MyColor
}) {
  const pairs = useMemo(() => buildMovePairs(movesSan), [movesSan])
  const activeRef = useRef<HTMLButtonElement>(null)
  const s = getStrings()

  // Own moves only.
  const blunderByPly = useMemo(() => {
    if (!evals) return new Map<number, Blunder>()
    const own = findBlunders(evals, movesSan, positions[0]).filter(
      (b) => whiteToMove(b.ply, positions[0]) === (myColor === 'white'),
    )
    return new Map(own.map((b) => [b.ply, b]))
  }, [evals, movesSan, positions, myColor])

  // Same tiers as the move-quality panel, so a move is named the same in both.
  const tierByPly = useMemo(() => {
    const map = new Map<number, BadMoveTier>()
    if (!evals) return map
    const { plies } = summarizeMoveQuality(evals, movesSan, positions[0])[myColor]
    for (const tier of ['inaccuracy', 'mistake', 'blunder'] as const) {
      for (const p of plies[tier]) map.set(p, tier)
    }
    return map
  }, [evals, movesSan, positions, myColor])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [ply])

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border border-zinc-200 bg-zinc-50 lg:min-h-0 lg:flex-1 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        ref={ply === 0 ? activeRef : undefined}
        onClick={() => onSelect(0)}
        className={`border-b border-zinc-200 px-3 py-1.5 text-left text-sm dark:border-zinc-800 ${
          ply === 0
            ? 'bg-accent/50 font-semibold text-zinc-900 dark:text-white'
            : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60'
        }`}
      >
        {s.board.startingPositionButton}
      </button>
      <ol className="max-h-70 overflow-y-auto text-base lg:max-h-none lg:min-h-0 lg:flex-1">
        {pairs.map((pair, i) => {
          const activeBlunder = blunderByPly.get(ply)
          const showDetailForPair =
            activeBlunder && (pair.white?.ply === ply || pair.black?.ply === ply)
          return (
            <Fragment key={pair.moveNumber}>
              <li className={`flex ${i % 2 === 1 ? 'bg-zinc-100 dark:bg-zinc-800/25' : ''}`}>
                <span className="w-8 shrink-0 px-2 py-1.5 text-zinc-500 tabular-nums">
                  {pair.moveNumber}.
                </span>
                {(['white', 'black'] as const).map((side) => {
                  const move = pair[side]
                  if (!move) {
                    return <span key={side} className="flex-1 px-2 py-1.5" />
                  }
                  const isActive = move.ply === ply
                  const tier = tierByPly.get(move.ply)
                  return (
                    <button
                      key={side}
                      ref={isActive ? activeRef : undefined}
                      onClick={() => onSelect(move.ply)}
                      className={`flex flex-1 items-center gap-1.5 px-2 py-1.5 text-left ${
                        isActive
                          ? 'bg-accent/50 font-semibold text-zinc-900 dark:text-white'
                          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <PieceMoveLabel san={move.san} color={side} />
                      {tier && <MoveQualityBadge tier={tier} />}
                    </button>
                  )
                })}
              </li>
              {showDetailForPair && activeBlunder && (
                <BlunderDetail
                  blunder={activeBlunder}
                  tier={tierByPly.get(activeBlunder.ply) ?? 'blunder'}
                  fenBefore={positions[activeBlunder.ply - 1]}
                  fenAfter={positions[activeBlunder.ply]}
                  myColor={myColor}
                />
              )}
            </Fragment>
          )
        })}
        {result && (
          <li className="px-2 py-1.5 font-medium text-zinc-500 dark:text-zinc-400">
            <span className="pl-8">{result}</span>
          </li>
        )}
      </ol>
    </div>
  )
}
