'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { describeEval, formatEval } from '@/lib/analysis'
import { whiteToMove } from '@/lib/drill'
import { formatMaterialDiff, materialDiff } from '@/lib/material'
import { buildPositions } from '@/lib/positions'
import { describeBetterMove } from '@/lib/tactics'
import type { PositionEval } from '@/lib/types'
import { EvalBar } from './EvalBar'
import { PieceMoveLabel } from './PieceMoveLabel'

interface BoardContextValue {
  ply: number
  setPly: (updater: number | ((ply: number) => number)) => void
  positions: string[]
  lastPly: number
  boardOrientation: 'white' | 'black'
  /** Most callers never flip — game replay pages fix orientation to the
   *  synced player's color for the whole session. Exposed so a consumer
   *  that *does* want a flip control (the /learn lesson board) can add one
   *  without Board.tsx needing to know anything about that use case. */
  setBoardOrientation: (
    updater: 'white' | 'black' | ((o: 'white' | 'black') => 'white' | 'black'),
  ) => void
  result?: string
  movesSan: string[]
  evals?: PositionEval[]
}

// The nav controls (⏮◀▶⏭) live in the page header, next to the analysis
// button, while the board + move list live further down — same
// Context-sharing shape as GameAnalysisPanel's button/dialog split, for the
// same reason: the two positions in the tree aren't adjacent.
const BoardContext = createContext<BoardContextValue | null>(null)

// Exported so consumers outside this file (e.g. the /learn lesson page, which
// needs the current ply to show a per-move explanation) can read the same
// context without Board.tsx needing to know anything about their use case.
export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('Must be used within <BoardProvider>')
  return ctx
}

export function BoardProvider({
  initialFen,
  movesSan,
  boardOrientation: initialBoardOrientation,
  result,
  evals,
  initialPly,
  children,
}: {
  initialFen: string
  movesSan: string[]
  boardOrientation: 'white' | 'black'
  result?: string
  evals?: PositionEval[]
  /** Which ply to show first — defaults to the last, since most callers
   *  (the game replay page) want to land on the final position. The /learn
   *  lesson page overrides this to 1 so a lesson opens on its first move
   *  instead of jumping straight to the end of the line. */
  initialPly?: number
  children: React.ReactNode
}) {
  const positions = useMemo(() => buildPositions(initialFen, movesSan), [initialFen, movesSan])
  const lastPly = positions.length - 1
  const [ply, setPly] = useState(initialPly ?? lastPly)
  const [boardOrientation, setBoardOrientation] = useState(initialBoardOrientation)

  return (
    <BoardContext.Provider
      value={{
        ply,
        setPly,
        positions,
        lastPly,
        boardOrientation,
        setBoardOrientation,
        result,
        movesSan,
        evals,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}

export function BoardNavControls() {
  const { ply, setPly, lastPly } = useBoardContext()

  return (
    <div className="flex items-center gap-2 text-sm">
      <NavButton onClick={() => setPly(0)} disabled={ply === 0} label="Start">
        ⏮
      </NavButton>
      <NavButton
        onClick={() => setPly((p) => Math.max(0, p - 1))}
        disabled={ply === 0}
        label="Previous move"
      >
        ◀
      </NavButton>
      <span className="min-w-16 text-center text-zinc-400 tabular-nums">
        {ply} / {lastPly}
      </span>
      <NavButton
        onClick={() => setPly((p) => Math.min(lastPly, p + 1))}
        disabled={ply === lastPly}
        label="Next move"
      >
        ▶
      </NavButton>
      <NavButton onClick={() => setPly(lastPly)} disabled={ply === lastPly} label="End">
        ⏭
      </NavButton>
    </div>
  )
}

export function BoardView({
  boardMaxWidthClassName = 'max-w-160',
}: {
  /** Lets a caller give the board more visual presence than the default
   *  game-replay sizing without changing that page's layout — e.g. the
   *  `/learn` lesson page, which has no move-list-heavy sidebar competing
   *  for width. */
  boardMaxWidthClassName?: string
} = {}) {
  const { ply, positions, boardOrientation, result, movesSan, evals, setPly } = useBoardContext()
  const bestMove = evals?.[ply]?.bestMove
  // positions[ply] is 0-indexed (ply plies already played), while
  // whiteToMove() takes the 1-indexed "which move number is this" — ply+1
  // converts between the two conventions.
  const betterMove = bestMove
    ? describeBetterMove(
        positions[ply],
        movesSan[ply] ?? '',
        bestMove,
        whiteToMove(ply + 1) ? 'white' : 'black',
      )
    : null

  // react-chessboard's slide animation looks great for a single adjacent-ply
  // step (the ◀/▶ buttons, or clicking the very next move in the list) but
  // tries to animate every piece that differs at once for a multi-ply jump
  // (Start/End, or clicking a move further down the list), which reads as a
  // flicker/blink rather than a clean cut. Only animate the adjacent case;
  // swap instantly for everything else. `prevPly` is updated during render
  // (React's documented "adjust state when a prop changes" pattern) rather
  // than a ref, so the comparison stays render-safe instead of reading
  // ref.current mid-render.
  const [prevPly, setPrevPly] = useState(ply)
  const [isAdjacentStep, setIsAdjacentStep] = useState(false)
  if (ply !== prevPly) {
    setIsAdjacentStep(Math.abs(ply - prevPly) === 1)
    setPrevPly(ply)
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex shrink-0 flex-col gap-3">
        <div className="flex items-stretch gap-2">
          {evals?.[ply] && <EvalBar evaluation={evals[ply]} boardOrientation={boardOrientation} />}
          <div className={`w-full overflow-hidden rounded shadow-lg ${boardMaxWidthClassName}`}>
            <Chessboard
              options={{
                position: positions[ply],
                boardOrientation,
                allowDragging: false,
                showAnimations: isAdjacentStep,
                darkSquareStyle: { backgroundColor: '#769656' },
                lightSquareStyle: { backgroundColor: '#eeeed2' },
                darkSquareNotationStyle: { color: '#eeeed2' },
                lightSquareNotationStyle: { color: '#769656' },
                arrows: bestMove
                  ? [
                      {
                        startSquare: bestMove.from,
                        endSquare: bestMove.to,
                        color: 'rgba(234, 179, 8, 0.9)',
                      },
                    ]
                  : [],
              }}
            />
          </div>
        </div>
        <p className="text-xs text-zinc-400">
          Material: {formatMaterialDiff(materialDiff(positions[ply]))}
          {evals?.[ply] && (
            <>
              {' '}
              · {describeEval(evals[ply])} ({formatEval(evals[ply])})
            </>
          )}
        </p>
        {betterMove && <p className="text-xs text-amber-400">Better was {betterMove}</p>}
      </div>

      <MoveList movesSan={movesSan} ply={ply} onSelect={setPly} result={result} />
    </div>
  )
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md border border-zinc-700 px-2.5 py-1 hover:bg-zinc-800 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

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

function MoveList({
  movesSan,
  ply,
  onSelect,
  result,
}: {
  movesSan: string[]
  ply: number
  onSelect: (ply: number) => void
  result?: string
}) {
  const pairs = useMemo(() => buildMovePairs(movesSan), [movesSan])
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [ply])

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-900 lg:max-w-xs lg:flex-1">
      <button
        ref={ply === 0 ? activeRef : undefined}
        onClick={() => onSelect(0)}
        className={`border-b border-zinc-800 px-3 py-1.5 text-left text-sm ${
          ply === 0
            ? 'bg-[#769656]/50 font-semibold text-white'
            : 'text-zinc-400 hover:bg-zinc-800/60'
        }`}
      >
        Starting position
      </button>
      <ol className="max-h-[480px] overflow-y-auto text-sm">
        {pairs.map((pair, i) => (
          <li key={pair.moveNumber} className={`flex ${i % 2 === 1 ? 'bg-zinc-800/25' : ''}`}>
            <span className="w-8 shrink-0 px-2 py-1.5 text-zinc-500 tabular-nums">
              {pair.moveNumber}.
            </span>
            {(['white', 'black'] as const).map((side) => {
              const move = pair[side]
              if (!move) {
                return <span key={side} className="flex-1 px-2 py-1.5" />
              }
              const isActive = move.ply === ply
              return (
                <button
                  key={side}
                  ref={isActive ? activeRef : undefined}
                  onClick={() => onSelect(move.ply)}
                  className={`flex-1 px-2 py-1.5 text-left ${
                    isActive
                      ? 'bg-[#769656]/50 font-semibold text-white'
                      : 'text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <PieceMoveLabel san={move.san} color={side} />
                </button>
              )
            })}
          </li>
        ))}
        {result && (
          <li className="px-2 py-1.5 font-medium text-zinc-400">
            <span className="pl-8">{result}</span>
          </li>
        )}
      </ol>
    </div>
  )
}
