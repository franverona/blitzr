'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { getStrings } from '@/lib/i18n/strings'
import { buildPositions } from '@/lib/positions'
import { BOARD_ANIMATION_DURATION_MS, BOARD_NOTATION_SIZE_STYLE } from '@/lib/theme'
import { useBoardColors } from './BoardColorsProvider'

/** A small interactive stepper through the engine's suggested move and its
 *  follow-up plan — SAN text alone doesn't let a beginner "see" where a
 *  quiet move leads a few plies out, so this replays it as a real,
 *  navigable board instead of a single static end-position thumbnail.
 *  `ply`/`setPly` are controlled by `PlanBoardButton` rather than owned
 *  here — its dialog needs the same state to route arrow-key shortcuts to
 *  this board instead of the game's own ply navigation while it's open (see
 *  `PlanBoardButton`'s `onKeyDown`).
 *
 *  Not rendered inline — see `PlanBoardButton` below, which is what every
 *  caller actually uses. */
export function PlanBoard({
  fenBefore,
  moves,
  boardOrientation,
  ply,
  setPly,
}: {
  fenBefore: string
  /** The suggested move followed by its expected continuation, e.g.
   *  `[bestMove.san, ...bestMove.bestLine]`. */
  moves: string[]
  boardOrientation: 'white' | 'black'
  ply: number
  setPly: (updater: number | ((ply: number) => number)) => void
}) {
  const positions = buildPositions(fenBefore, moves)
  const lastPly = positions.length - 1
  // react-chessboard needs a unique `id` per instance — without one, this
  // board collides with whatever other Chessboard is on the page (the main
  // replay board, or another PlanBoard in a blunder list) on shared DOM ids
  // internally and crashes with "Square width not found".
  const boardId = useId()
  const s = getStrings()
  const boardColors = useBoardColors()

  return (
    <div className="flex w-full shrink-0 flex-col gap-3">
      <div className="aspect-square w-full overflow-hidden rounded shadow-lg">
        <Chessboard
          options={{
            id: boardId,
            position: positions[ply],
            boardOrientation,
            allowDragging: false,
            showNotation: true,
            animationDurationInMs: BOARD_ANIMATION_DURATION_MS,
            darkSquareStyle: { backgroundColor: boardColors.dark },
            lightSquareStyle: { backgroundColor: boardColors.light },
            darkSquareNotationStyle: boardColors.darkSquareNotationStyle,
            lightSquareNotationStyle: boardColors.lightSquareNotationStyle,
            alphaNotationStyle: BOARD_NOTATION_SIZE_STYLE,
            numericNotationStyle: BOARD_NOTATION_SIZE_STYLE,
          }}
        />
      </div>
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

/** "Show" link + dialog wrapper around `PlanBoard` — same native `<dialog>`
 *  convention as `AboutOpeningButton`. The plan board used to render inline,
 *  always visible right under the main board; that ate vertical space on
 *  every blunder ply whether or not you cared to see the follow-up, so it's
 *  opt-in now, next to the "Better was …" text that already names the move.
 *  Pass a fresh `key` (e.g. `key={ply}`) whenever `fenBefore`/`moves` change
 *  to a different plan, same requirement `PlanBoard` used to have on its own
 *  — this forwards it by remounting (and re-closing, and resetting the plan
 *  back to its own ply 0) the trigger + dialog.
 *
 *  Owns the plan's `ply` state (rather than leaving it inside `PlanBoard`)
 *  so the dialog's `onKeyDown` can drive it directly: `BoardNavControls`
 *  binds ←/→ globally on `window`, and a native `<dialog>`'s modal-ness
 *  doesn't stop a keydown that fires inside it from bubbling all the way up
 *  to `window` — without interception here, pressing an arrow key while
 *  this dialog is open would step the *game's* ply instead, which (via the
 *  `key={ply}` this component gets remounted on at the game-board call
 *  site) would unmount and re-close this dialog out from under you. Calling
 *  `stopPropagation` on the dialog element catches the event before it gets
 *  that far, so ←/→ step the plan while the dialog is open and only reach
 *  the game board again once it's closed (focus no longer inside it). */
export function PlanBoardButton({
  betterMove,
  fenBefore,
  moves,
  boardOrientation,
}: {
  /** The already-formatted "better was" move description, reused as the
   *  dialog title so it's clear which move's plan is being shown. */
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
      <dialog
        ref={dialogRef}
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
            <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
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
