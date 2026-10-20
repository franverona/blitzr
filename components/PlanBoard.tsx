'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { Dialog } from './Dialog'
import { getStrings } from '@/lib/i18n/strings'
import { buildPositions } from '@/lib/positions'
import { BOARD_ANIMATION_DURATION_MS } from '@/lib/theme'
import { useSettings } from './SettingsProvider'
import { buttonClass } from './styles'

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
            className={buttonClass({ size: 'xs' })}
          >
            ⏮
          </button>
          <button
            onClick={() => setPly((p) => Math.max(0, p - 1))}
            disabled={ply === 0}
            aria-label={s.planBoard.navLabels.previous}
            className={buttonClass({ size: 'xs' })}
          >
            ◀
          </button>
          <button
            onClick={() => setPly((p) => Math.min(lastPly, p + 1))}
            disabled={ply === lastPly}
            aria-label={s.planBoard.navLabels.next}
            className={buttonClass({ size: 'xs' })}
          >
            ▶
          </button>
          <button
            onClick={() => setPly(lastPly)}
            disabled={ply === lastPly}
            aria-label={s.planBoard.navLabels.end}
            className={buttonClass({ size: 'xs' })}
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
      <Dialog
        ref={dialogRef}
        title={`${s.common.betterWas} ${betterMove}`}
        titleClassName="text-sm text-amber-600 dark:text-amber-400"
        className="max-w-xl"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          e.stopPropagation()
          setPly((p) => (e.key === 'ArrowLeft' ? Math.max(0, p - 1) : Math.min(lastPly, p + 1)))
        }}
      >
        <PlanBoard
          fenBefore={fenBefore}
          moves={moves}
          boardOrientation={boardOrientation}
          ply={ply}
          setPly={setPly}
        />
      </Dialog>
    </>
  )
}
