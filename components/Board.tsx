'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Chessboard } from 'react-chessboard'
import { describeEval, findBlunders, formatEval } from '@/lib/analysis'
import { buildPositionChecklist, findingKey, findingMarks } from '@/lib/checklist'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { formatMaterialDiff, materialDiff } from '@/lib/material'
import { buildPositions } from '@/lib/positions'
import { describeBetterMove } from '@/lib/tactics'
import {
  BOARD_ANIMATION_DURATION_MS,
  BOARD_DARK_SQUARE,
  BOARD_LIGHT_SQUARE,
  CHECKLIST_ARROW_COLOR,
  CHECKLIST_SQUARE_COLOR,
  REVEAL_ARROW_COLOR,
} from '@/lib/theme'
import type { PositionEval } from '@/lib/types'
import { EvalBar } from './EvalBar'
import { PieceMoveLabel } from './PieceMoveLabel'
import { PlanBoard } from './PlanBoard'

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
  /** Keys (`findingKey()`, `lib/checklist.ts`) of checklist findings the user
   *  has dismissed from the board — `PositionChecklist`'s per-finding "Hide"
   *  toggle writes here, `BoardView` reads it to skip drawing that finding's
   *  arrow/highlight, so showing every finding on the board by default
   *  doesn't turn into unremovable clutter on a busy position. */
  hiddenFindingKeys: Set<string>
  toggleFindingVisibility: (key: string) => void
}

// The nav controls (⏮◀▶⏭) live in the page header, next to the analysis
// button, while the board + move list live further down — same
// Context-sharing shape as GameAnalysisPanel's button/dialog split, for the
// same reason: the two positions in the tree aren't adjacent.
const BoardContext = createContext<BoardContextValue | null>(null)

// How long the Play toggle in BoardNavControls waits between auto-advancing
// one ply — long enough to actually read the position, short enough that
// watching a full game doesn't feel sluggish.
const PLAY_INTERVAL_MS = 500

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
  /** Which ply to show first — defaults to the last ply if omitted, but
   *  every current caller passes its own value instead: the game replay
   *  page opens on ply 1 (the first move already played, not the empty
   *  starting position) so the board shows something happened; /learn's
   *  Study mode does the same, Quiz mode opens on 0 instead. */
  initialPly?: number
  children: React.ReactNode
}) {
  const positions = useMemo(() => buildPositions(initialFen, movesSan), [initialFen, movesSan])
  const lastPly = positions.length - 1
  // Clamped in case a caller's fixed initialPly (e.g. the game page's 1)
  // exceeds a real lastPly of 0 — a synced game can have zero parsed moves.
  const [ply, setPly] = useState(Math.min(initialPly ?? lastPly, lastPly))
  const [boardOrientation, setBoardOrientation] = useState(initialBoardOrientation)
  const [hiddenFindingKeys, setHiddenFindingKeys] = useState<Set<string>>(new Set())
  const toggleFindingVisibility = useCallback((key: string) => {
    setHiddenFindingKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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
        hiddenFindingKeys,
        toggleFindingVisibility,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}

export function BoardNavControls() {
  const { ply, setPly, lastPly, movesSan, evals } = useBoardContext()
  const s = getStrings()
  const [isPlaying, setIsPlaying] = useState(false)

  // Mirror `ply`/`isPlaying` in refs so the setInterval/keydown callbacks
  // below can read the latest value without being dependencies of the
  // effects that create them (which would tear down and recreate the
  // interval/listener on every single step) — and, for `togglePlaying`, so
  // it never nests a `setPly` call inside `setIsPlaying`'s own updater
  // function, which React flags as updating one component's state while
  // rendering another's (`setPly` belongs to `BoardProvider`, not here).
  // Synced via an effect (not assigned directly during render) since refs
  // are only safe to read/write outside of render.
  const plyRef = useRef(ply)
  const isPlayingRef = useRef(isPlaying)
  useEffect(() => {
    plyRef.current = ply
    isPlayingRef.current = isPlaying
  })

  const goToStart = useCallback(() => {
    setIsPlaying(false)
    setPly(0)
  }, [setPly])
  const goToPrevious = useCallback(() => {
    setIsPlaying(false)
    setPly((p) => Math.max(0, p - 1))
  }, [setPly])
  const goToNext = useCallback(() => {
    setIsPlaying(false)
    setPly((p) => Math.min(lastPly, p + 1))
  }, [setPly, lastPly])
  const goToEnd = useCallback(() => {
    setIsPlaying(false)
    setPly(lastPly)
  }, [setPly, lastPly])
  const togglePlaying = useCallback(() => {
    if (isPlayingRef.current) {
      setIsPlaying(false)
      return
    }
    if (plyRef.current >= lastPly) setPly(0) // restart from the beginning if already at the end
    setIsPlaying(true)
  }, [lastPly, setPly])

  // Left/right arrow keys step through the game the same as the ◀/▶
  // buttons, Space toggles Play/Pause, and 0 jumps to the start — global,
  // not scoped to a focused element, matching the chess.com/lichess
  // convention this page's audience already knows. Only mounted where the
  // buttons themselves are (games/[id], and /learn's Study mode but not
  // Quiz mode), so this never fights with Quiz mode's own input handling.
  const lastNavAtRef = useRef(0)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Space is a native activation key for a focused <button> (e.g. the
      // Play/Pause button itself, right after clicking it) — without this
      // guard, pressing it would toggle play twice: once from the button's
      // own native click, once from this listener.
      if (e.key === ' ' && e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') {
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        togglePlaying()
        return
      }
      if (e.key === '0') {
        goToStart()
        return
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      // Holding the key down (or just tapping it fast) fires keydown much
      // quicker than the board's own slide animation can finish — each new
      // position prop cuts the previous slide off mid-flight, which reads
      // as flickering pieces rather than a clean step. Throttling to the
      // same duration as the animation keeps one step finished before the
      // next one starts.
      const now = Date.now()
      if (now - lastNavAtRef.current < BOARD_ANIMATION_DURATION_MS) return
      lastNavAtRef.current = now
      if (e.key === 'ArrowLeft') goToPrevious()
      else goToNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goToPrevious, goToNext, goToStart, togglePlaying])

  // Every ply that's a blunder (200cp+ swing) for whoever just moved — same
  // definition findBlunders() already uses for the analysis dialog/
  // blunders page, reused here as "auto-play's stopping points" instead of
  // a separate notion of what counts as relevant. `undefined` (unanalyzed
  // game) just means autoplay has nothing to stop for except the end.
  const blunderPlies = useMemo(
    () => (evals ? new Set(findBlunders(evals, movesSan).map((b) => b.ply)) : null),
    [evals, movesSan],
  )

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      const next = Math.min(plyRef.current + 1, lastPly)
      setPly(next)
      if (next === lastPly || blunderPlies?.has(next)) setIsPlaying(false)
    }, PLAY_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isPlaying, lastPly, blunderPlies, setPly])

  return (
    <div className="flex items-center gap-2 text-sm">
      <NavButton onClick={goToStart} disabled={ply === 0} label={s.board.navLabels.start}>
        ⏮
      </NavButton>
      <NavButton onClick={goToPrevious} disabled={ply === 0} label={s.board.navLabels.previous}>
        ◀
      </NavButton>
      <span className="min-w-16 text-center text-zinc-400 tabular-nums">
        {ply} / {lastPly}
      </span>
      <NavButton onClick={goToNext} disabled={ply === lastPly} label={s.board.navLabels.next}>
        ▶
      </NavButton>
      <NavButton onClick={goToEnd} disabled={ply === lastPly} label={s.board.navLabels.end}>
        ⏭
      </NavButton>
      <span className="mx-1 h-4 w-px bg-zinc-700" />
      <button
        onClick={togglePlaying}
        disabled={lastPly === 0}
        className={`rounded-md border px-2.5 py-1 disabled:opacity-40 ${
          isPlaying ? 'border-accent bg-accent/20 text-white' : 'border-zinc-700 hover:bg-zinc-800'
        }`}
      >
        {isPlaying ? s.board.navLabels.pause : s.board.navLabels.play}
      </button>
    </div>
  )
}

export function BoardView({
  boardMaxWidthClassName = 'max-w-160',
  sidebarExtra,
}: {
  /** Lets a caller give the board more visual presence than the default
   *  game-replay sizing without changing that page's layout — e.g. the
   *  `/learn` lesson page, which has no move-list-heavy sidebar competing
   *  for width. */
  boardMaxWidthClassName?: string
  /** Extra content stacked below the move list, in the same width-capped
   *  sidebar column — e.g. the game page's `PositionChecklist`, which needs
   *  to stay next to the board so stepping through moves never requires
   *  scrolling to see it. Undefined for every other caller (`/learn`
   *  lessons have no such per-position sidebar content), so this changes
   *  nothing for them. */
  sidebarExtra?: React.ReactNode
} = {}) {
  const { ply, positions, boardOrientation, result, movesSan, evals, setPly, hiddenFindingKeys } =
    useBoardContext()
  const s = getStrings()
  // react-chessboard needs a unique `id` per instance — without one, two
  // simultaneous boards on the same page (this one plus a PlanBoard showing
  // the suggested move's plan) collide on shared DOM ids internally and
  // crash with "Square width not found".
  const boardId = useId()
  const bestMove = evals?.[ply]?.bestMove

  // Checklist findings shown directly on the board (arrows + highlighted
  // squares), not just as sidebar text — recomputed from the same pure
  // `buildPositionChecklist()` `PositionChecklist` already calls on this
  // ply's FEN, so this needed no new detection logic, only a mapping to
  // board marks. Filtered by `hiddenFindingKeys` so a finding the user
  // dismissed there stops being drawn here too.
  const checklistSquareStyles = useMemo(() => {
    const findings = buildPositionChecklist(positions[ply]).filter(
      (f) => !hiddenFindingKeys.has(findingKey(f)),
    )
    const styles: Record<string, React.CSSProperties> = {}
    // Keyed by "from-to" so two findings that happen to draw the same arrow
    // (e.g. both an attacker's fork and skewer landing on the same square
    // pair) don't hand react-chessboard two arrows with an identical key —
    // it renders each arrow keyed by its own start/end squares and warns on
    // the duplicate.
    const arrowsByKey = new Map<string, { startSquare: string; endSquare: string; color: string }>()
    for (const f of findings) {
      const marks = findingMarks(f.reason)
      for (const square of marks.squares) {
        styles[square] = { backgroundColor: CHECKLIST_SQUARE_COLOR }
      }
      for (const [startSquare, endSquare] of marks.arrows) {
        arrowsByKey.set(`${startSquare}-${endSquare}`, {
          startSquare,
          endSquare,
          color: CHECKLIST_ARROW_COLOR,
        })
      }
    }
    return { styles, arrows: [...arrowsByKey.values()] }
  }, [positions, ply, hiddenFindingKeys])
  // Merge with the engine's own suggested-move arrow, deduped the same way —
  // react-chessboard keys each arrow by its start/end squares alone (not by
  // color), so a checklist arrow landing on the exact same two squares as
  // the reveal arrow would otherwise hand it two arrows sharing one key. The
  // reveal arrow wins when they collide: it's the primary "what to play
  // instead" callout, the checklist one is supplementary.
  const boardArrows = useMemo(() => {
    const arrows = new Map<string, { startSquare: string; endSquare: string; color: string }>()
    for (const arrow of checklistSquareStyles.arrows) {
      arrows.set(`${arrow.startSquare}-${arrow.endSquare}`, arrow)
    }
    if (bestMove) {
      arrows.set(`${bestMove.from}-${bestMove.to}`, {
        startSquare: bestMove.from,
        endSquare: bestMove.to,
        color: REVEAL_ARROW_COLOR,
      })
    }
    return [...arrows.values()]
  }, [checklistSquareStyles.arrows, bestMove])
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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      <div className={`flex w-full shrink-0 flex-col gap-3 ${boardMaxWidthClassName}`}>
        <div className="flex items-stretch gap-2">
          {evals?.[ply] && <EvalBar evaluation={evals[ply]} boardOrientation={boardOrientation} />}
          <div className={`w-full overflow-hidden rounded shadow-lg ${boardMaxWidthClassName}`}>
            <Chessboard
              options={{
                id: boardId,
                position: positions[ply],
                boardOrientation,
                allowDragging: false,
                showAnimations: isAdjacentStep,
                animationDurationInMs: BOARD_ANIMATION_DURATION_MS,
                darkSquareStyle: { backgroundColor: BOARD_DARK_SQUARE },
                lightSquareStyle: { backgroundColor: BOARD_LIGHT_SQUARE },
                darkSquareNotationStyle: { color: BOARD_LIGHT_SQUARE },
                lightSquareNotationStyle: { color: BOARD_DARK_SQUARE },
                squareStyles: checklistSquareStyles.styles,
                arrows: boardArrows,
              }}
            />
          </div>
        </div>
        <p className="text-xs text-zinc-400">
          {s.board.material} {formatMaterialDiff(materialDiff(positions[ply]))}
          {evals?.[ply] && (
            <>
              {' '}
              · {describeEval(evals[ply])} ({formatEval(evals[ply])})
            </>
          )}
        </p>
        {betterMove && (
          <p className="text-xs text-amber-400">
            {s.common.betterWas} {betterMove}
          </p>
        )}
        {bestMove && bestMove.bestLine?.length > 0 && (
          <PlanBoard
            key={ply}
            fenBefore={positions[ply]}
            moves={[bestMove.san, ...bestMove.bestLine]}
            boardOrientation={boardOrientation}
          />
        )}
      </div>

      <div className="flex w-full flex-col gap-4 lg:max-w-sm lg:flex-1 xl:max-w-md">
        <MoveList movesSan={movesSan} ply={ply} onSelect={setPly} result={result} />
        {sidebarExtra}
      </div>
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
  const s = getStrings()

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [ply])

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-900">
      <button
        ref={ply === 0 ? activeRef : undefined}
        onClick={() => onSelect(0)}
        className={`border-b border-zinc-800 px-3 py-1.5 text-left text-sm ${
          ply === 0 ? 'bg-accent/50 font-semibold text-white' : 'text-zinc-400 hover:bg-zinc-800/60'
        }`}
      >
        {s.board.startingPositionButton}
      </button>
      <ol className="max-h-70 overflow-y-auto text-sm">
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
                      ? 'bg-accent/50 font-semibold text-white'
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
