'use client'

import { Fragment, useEffect, useMemo, useRef } from 'react'
import { findBlunders, formatEval, formatSwing } from '@/lib/analysis'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { describeMove } from '@/lib/san'
import { describeBetterMove, describeBlunderReason, detectBlunderReason } from '@/lib/tactics'
import type { Blunder, MyColor, PositionEval } from '@/lib/types'
import { BlunderSeverityBadge } from './BlunderSeverityBadge'
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

/** The detail block a selected blunder ply expands into — ported as-is from
 *  the old `AnalysisDialog` (`GameAnalysisPanel.tsx`), which this inline view
 *  replaces: same swing/reason/better-move content, just anchored under the
 *  move itself instead of in a separate dialog. */
function BlunderDetail({
  blunder,
  fenBefore,
  fenAfter,
  myColor,
}: {
  blunder: Blunder
  fenBefore: string
  fenAfter: string
  myColor: MyColor
}) {
  const s = getStrings()
  const reason = detectBlunderReason(fenBefore, fenAfter, myColor)
  const bestMove = blunder.evalBefore.bestMove
  // Full text (dialog title) still includes the engine's plan as a sentence,
  // same as `PlanBoardButton`'s other call site (`Board.tsx`) — but the
  // *inline* text below it strips the plan clause (`bestLine: []`) since
  // `MoveSequence` right underneath already renders that same line with
  // piece icons; showing it twice, once as a plain-text sentence and once
  // as icons, was pure duplication.
  const betterMove = describeBetterMove(fenBefore, blunder.moveSan, bestMove, myColor)
  const betterMoveHead = bestMove
    ? describeBetterMove(fenBefore, blunder.moveSan, { ...bestMove, bestLine: [] }, myColor)
    : null

  return (
    <li className="bg-accent/10 flex flex-col gap-1.5 border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <BlunderSeverityBadge swingCp={blunder.swingCp} />
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
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
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
  /** Saved batch analysis, when present — drives the inline blunder badges
   *  and expand-on-select detail below. Undefined for an unanalyzed game,
   *  same "quietly render nothing extra" fallback other analysis UI uses. */
  evals?: PositionEval[]
  /** FEN before each ply, same indexing as `evals`/`movesSan`. */
  positions: string[]
  myColor: MyColor
}) {
  const pairs = useMemo(() => buildMovePairs(movesSan), [movesSan])
  const activeRef = useRef<HTMLButtonElement>(null)
  const s = getStrings()

  // Scoped to the account's own moves only — same convention as
  // `GameSummary`/`/blunders`/drill cards (opponent mistakes aren't
  // actionable for training).
  const blunderByPly = useMemo(() => {
    if (!evals) return new Map<number, Blunder>()
    const own = findBlunders(evals, movesSan).filter(
      (b) => whiteToMove(b.ply) === (myColor === 'white'),
    )
    return new Map(own.map((b) => [b.ply, b]))
  }, [evals, movesSan, myColor])

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
                  const blunder = blunderByPly.get(move.ply)
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
                      {blunder && <BlunderSeverityBadge swingCp={blunder.swingCp} />}
                    </button>
                  )
                })}
              </li>
              {showDetailForPair && activeBlunder && (
                <BlunderDetail
                  blunder={activeBlunder}
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
