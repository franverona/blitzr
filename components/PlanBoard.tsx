'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { getStrings } from '@/lib/i18n/strings'
import { buildPositions } from '@/lib/positions'
import { BOARD_ANIMATION_DURATION_MS } from '@/lib/theme'
import { useSettings } from './SettingsProvider'

/** Steps through the engine's suggested move and its follow-up plan.
 *  `ply` is controlled by `PlanBoardButton`. */
export function PlanBoard({
  fenBefore,
  moves,
  boardOrientation,
  ply,
  setPly,
}: {
  fenBefore: string
  /** `[bestMove.san, ...bestMove.bestLine]`. */
  moves: string[]
  boardOrientation: 'white' | 'black'
  ply: number
  setPly: (updater: number | ((ply: number) => number)) => void
}) {
  const positions = buildPositions(fenBefore, moves)
  const lastPly = positions.length - 1
  // Unique id required: multiple boards on one page crash otherwise.
  const boardId = useId()
  const s = getStrings()
  const boardColors = useSettings()

  return (
    <div className="flex w-full shrink-0 flex-col gap-3">
      <BoardCoordinates
        show={boardColors.showCoordinates}
        orientation={boardOrientation}
        className="w-full"
      >
        <div className="aspect-square w-full overflow-hidden rounded shadow-lg">
          <Chessboard
            options={{
              id: boardId,
              position: positions[ply],
              boardOrientation,
              allowDragging: false,
              showNotation: false,
              animationDurationInMs: BOARD_ANIMATION_DURATION_MS,
              darkSquareStyle: { backgroundColor: boardColors.dark },
              lightSquareStyle: { backgroundColor: boardColors.light },
            }}
          />
        </div>
      </BoardCoordinates>
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          {s.planBoard.label} {ply} / {lastPly}
          {ply > 0 && ` — ${moves[ply - 1]}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPly(0)}
            disabled={ply === 0}
            aria-label={s.planBoard.navLabels.start}
            className="rounded border border-zinc-300 px-1.5 py-0.5 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ⏮
          </button>
          <button
            onClick={() => setPly((p) => Math.max(0, p - 1))}
            disabled={ply === 0}
            aria-label={s.planBoard.navLabels.previous}
            className="rounded border border-zinc-300 px-1.5 py-0.5 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ◀
          </button>
          <button
            onClick={() => setPly((p) => Math.min(lastPly, p + 1))}
            disabled={ply === lastPly}
            aria-label={s.planBoard.navLabels.next}
            className="rounded border border-zinc-300 px-1.5 py-0.5 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ▶
          </button>
          <button
            onClick={() => setPly(lastPly)}
            disabled={ply === lastPly}
            aria-label={s.planBoard.navLabels.end}
            className="rounded border border-zinc-300 px-1.5 py-0.5 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  )
}

/** "Show" link + dialog around `PlanBoard`. Remount with a new `key` when the
 *  plan changes. Owns `ply` so the dialog can stop ←/→ from bubbling to
 *  `BoardNavControls`' window listener, which would step the game instead. */
export function PlanBoardButton({
  betterMove,
  fenBefore,
  moves,
  boardOrientation,
}: {
  betterMove: string
  fenBefore: string
  moves: string[]
  boardOrientation: 'white' | 'black'
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [ply, setPly] = useState(0)
  const lastPly = useMemo(() => buildPositions(fenBefore, moves).length - 1, [fenBefore, moves])
  const s = getStrings()

  return (
    <>
      {' — '}
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="underline decoration-dotted underline-offset-2 hover:text-amber-600 dark:hover:text-amber-300"
      >
        {s.common.show}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close()
        }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          e.stopPropagation()
          setPly((p) => (e.key === 'ArrowLeft' ? Math.max(0, p - 1) : Math.min(lastPly, p + 1)))
        }}
        className="fixed top-1/2 left-1/2 m-0 max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-200 bg-zinc-50 p-0 text-left text-zinc-900 backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {s.common.betterWas} {betterMove}
            </h2>
            <button
              onClick={() => dialogRef.current?.close()}
              aria-label={s.common.close}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
          <PlanBoard
            fenBefore={fenBefore}
            moves={moves}
            boardOrientation={boardOrientation}
            ply={ply}
            setPly={setPly}
          />
        </div>
      </dialog>
    </>
  )
}
