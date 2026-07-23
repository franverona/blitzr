'use client'

import { useId, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { buildPositions } from '@/lib/positions'
import { BOARD_DARK_SQUARE, BOARD_LIGHT_SQUARE } from '@/lib/theme'

/** A small interactive stepper through the engine's suggested move and its
 *  follow-up plan — SAN text alone doesn't let a beginner "see" where a
 *  quiet move leads a few plies out, so this replays it as a real,
 *  navigable board instead of a single static end-position thumbnail.
 *  Self-contained (own `ply` state, no `BoardProvider`/context) — this is a
 *  short, one-off sequence unrelated to the game's own ply navigation.
 *  Callers must pass a fresh `key` whenever `fenBefore`/`moves` change to a
 *  different plan (e.g. `key={ply}` when stepping the main board) — like
 *  every other `useState(initialX)` component in this app, it only reads
 *  its initial ply on mount. */
export function PlanBoard({
  fenBefore,
  moves,
  boardOrientation,
}: {
  fenBefore: string
  /** The suggested move followed by its expected continuation, e.g.
   *  `[bestMove.san, ...bestMove.bestLine]`. */
  moves: string[]
  boardOrientation: 'white' | 'black'
}) {
  const positions = buildPositions(fenBefore, moves)
  const lastPly = positions.length - 1
  // Starts on the suggested move already played (ply 1), not the pre-move
  // position the main board is already showing.
  const [ply, setPly] = useState(Math.min(1, lastPly))
  // react-chessboard needs a unique `id` per instance — without one, this
  // board collides with whatever other Chessboard is on the page (the main
  // replay board, or another PlanBoard in a blunder list) on shared DOM ids
  // internally and crashes with "Square width not found".
  const boardId = useId()

  return (
    <div className="flex w-80 flex-col gap-1.5">
      <div className="aspect-square w-full overflow-hidden rounded shadow-lg">
        <Chessboard
          options={{
            id: boardId,
            position: positions[ply],
            boardOrientation,
            allowDragging: false,
            showNotation: false,
            darkSquareStyle: { backgroundColor: BOARD_DARK_SQUARE },
            lightSquareStyle: { backgroundColor: BOARD_LIGHT_SQUARE },
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          Plan {ply} / {lastPly}
          {ply > 0 && ` — ${moves[ply - 1]}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPly(0)}
            disabled={ply === 0}
            aria-label="Start of plan"
            className="rounded border border-zinc-700 px-1.5 py-0.5 hover:bg-zinc-800 disabled:opacity-40"
          >
            ⏮
          </button>
          <button
            onClick={() => setPly((p) => Math.max(0, p - 1))}
            disabled={ply === 0}
            aria-label="Previous plan move"
            className="rounded border border-zinc-700 px-1.5 py-0.5 hover:bg-zinc-800 disabled:opacity-40"
          >
            ◀
          </button>
          <button
            onClick={() => setPly((p) => Math.min(lastPly, p + 1))}
            disabled={ply === lastPly}
            aria-label="Next plan move"
            className="rounded border border-zinc-700 px-1.5 py-0.5 hover:bg-zinc-800 disabled:opacity-40"
          >
            ▶
          </button>
          <button
            onClick={() => setPly(lastPly)}
            disabled={ply === lastPly}
            aria-label="End of plan"
            className="rounded border border-zinc-700 px-1.5 py-0.5 hover:bg-zinc-800 disabled:opacity-40"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  )
}
