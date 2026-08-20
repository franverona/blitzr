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
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { describeEval, findBlunders, formatEval } from '@/lib/analysis'
import { buildPositionChecklist, findingKey, findingMarks } from '@/lib/checklist'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { formatMaterialDiff, materialDiff } from '@/lib/material'
import { buildPositions } from '@/lib/positions'
import { StockfishEngine } from '@/lib/stockfish/client'
import { describeBetterMove } from '@/lib/tactics'
import {
  BOARD_ANIMATION_DURATION_MS,
  BOARD_DARK_SQUARE,
  BOARD_DARK_SQUARE_NOTATION_STYLE,
  BOARD_LIGHT_SQUARE,
  BOARD_LIGHT_SQUARE_NOTATION_STYLE,
  BOARD_NOTATION_SIZE_STYLE,
  CHECKLIST_ARROW_COLOR,
  CHECKLIST_SQUARE_COLOR,
  REVEAL_ARROW_COLOR,
} from '@/lib/theme'
import type { EngineLine, PositionEval } from '@/lib/types'
import { EvalBar } from './EvalBar'
import { LegalMoveSquare } from './LegalMoveSquare'
import { PieceMoveLabel } from './PieceMoveLabel'
import { PlanBoardButton } from './PlanBoard'

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
  /** Free-move exploration off the currently-displayed recorded ply, chess.com
   *  analysis-tab style — see `ExploreToggleButton`/`LiveAnalysisPanel`. Kept
   *  entirely separate from `ply`/`positions` (the recorded game) rather than
   *  extending that ply concept: exploration is a branch that doesn't belong
   *  to the game, never persists, and can be discarded by exiting. */
  exploring: boolean
  /** SAN moves played since `startExploring()`, from whatever ply was current
   *  at that moment. */
  explorePath: string[]
  /** How far into `explorePath` the board is currently showing (0 =
   *  exploration's own starting position). */
  explorePly: number
  /** FEN per explore step, same indexing convention as `positions` —
   *  `explorePositions[0]` is the branch point, before `explorePath[0]`. */
  explorePositions: string[]
  /** Whatever FEN the board should actually render right now — the recorded
   *  `positions[ply]` normally, or the current explore step while exploring.
   *  The one thing every consumer that draws *a* position (not the move
   *  list) should read instead of `positions[ply]` directly. */
  displayFen: string
  startExploring: () => void
  exitExploring: () => void
  setExplorePly: (updater: number | ((ply: number) => number)) => void
  /** Attempts `from`->`to` on the current explore position, always promoting
   *  to queen (same simplification `RepertoireBoard` makes — underpromotion
   *  essentially never comes up here either). Returns whether it was legal;
   *  playing it truncates any explored moves past the current explore ply,
   *  same "new move overwrites the future" rule a normal board edit implies. */
  attemptExploreMove: (from: string, to: string) => boolean
  /** Queues a whole SAN sequence (e.g. an engine line's suggested moves)
   *  onto the explore branch at once, starting exploring first if not
   *  already — so clicking "play this line" works equally from a normal
   *  replay ply or mid-exploration. Leaves `explorePly` where it was rather
   *  than jumping to the line's end: the point is to let the ◀/▶ nav step
   *  through it one move at a time afterward, watching each move land
   *  individually, not to just present the final position. Lets a user
   *  follow a multi-move suggestion this way without manually dragging each
   *  piece — which, before this existed, lost its own reference partway
   *  through: each manual move re-searches and replaces the very line being
   *  copied. Stops at the first move that doesn't apply (e.g. a stale line
   *  for a position the board has since moved on from) rather than applying
   *  a partial line from the wrong position. Returns whether *anything* was
   *  applied — false (a no-op) only when even the first move didn't apply,
   *  so a caller offering its own success feedback (`LiveAnalysisPanel`'s
   *  queued checkmark) doesn't show it for a line that silently did
   *  nothing. */
  playExploreLine: (sanMoves: string[]) => boolean
  /** Discards the whole explored branch's moves and jumps back to its start
   *  (ply 0) without leaving exploring mode — the "actually get rid of this
   *  line" companion to the ◀/⏮ nav, which only moves the *pointer* back
   *  and leaves the moves themselves in place, ready to walk forward into
   *  again. Lets a user who played (or dragged out) a line they don't want
   *  get back to a clean branch to try something else, without needing to
   *  exit exploring and re-enter it. */
  resetExploreLine: () => void
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

  const [exploring, setExploring] = useState(false)
  const [exploreBaseFen, setExploreBaseFen] = useState<string | null>(null)
  const [explorePath, setExplorePathState] = useState<string[]>([])
  const [explorePly, setExplorePlyState] = useState(0)
  // Refs mirror the two states above, updated synchronously by the wrapper
  // setters below — `attemptExploreMove`/`playExploreLine` read *these*,
  // not the state values, when computing "where the branch currently is."
  // Same reasoning (and pattern) as `RepertoireBoard`'s `nodesRef`/`pathRef`:
  // two explore moves fired back-to-back, faster than a render, would
  // otherwise both compute their "current position" from the same
  // pre-update closure — the second move then gets evaluated against (and
  // spliced into the path at) the position from *before* the first move,
  // not after it.
  const explorePathRef = useRef(explorePath)
  const explorePlyRef = useRef(explorePly)

  function setExplorePath(updater: string[] | ((prev: string[]) => string[])) {
    explorePathRef.current =
      typeof updater === 'function' ? updater(explorePathRef.current) : updater
    setExplorePathState(explorePathRef.current)
  }
  function setExplorePly(updater: number | ((prev: number) => number)) {
    explorePlyRef.current = typeof updater === 'function' ? updater(explorePlyRef.current) : updater
    setExplorePlyState(explorePlyRef.current)
  }

  const explorePositions = useMemo(
    () => (exploreBaseFen !== null ? buildPositions(exploreBaseFen, explorePath) : []),
    [exploreBaseFen, explorePath],
  )
  const displayFen = exploring ? (explorePositions[explorePly] ?? exploreBaseFen!) : positions[ply]

  const startExploring = useCallback(() => {
    setExploreBaseFen(positions[ply])
    setExplorePath([])
    setExplorePly(0)
    setExploring(true)
  }, [positions, ply])

  const exitExploring = useCallback(() => {
    setExploring(false)
    setExploreBaseFen(null)
    setExplorePath([])
    setExplorePly(0)
  }, [])

  const attemptExploreMove = useCallback(
    (from: string, to: string): boolean => {
      const currentPly = explorePlyRef.current
      const fen = (exploreBaseFen ? buildPositions(exploreBaseFen, explorePathRef.current) : [])[
        currentPly
      ]
      if (!fen) return false
      const chess = new Chess(fen)
      let move
      try {
        move = chess.move({ from, to, promotion: 'q' })
      } catch {
        return false
      }
      if (!move) return false
      setExplorePath((prev) => [...prev.slice(0, currentPly), move.san])
      setExplorePly(currentPly + 1)
      return true
    },
    [exploreBaseFen],
  )

  const playExploreLine = useCallback(
    (sanMoves: string[]): boolean => {
      const currentlyExploring = exploring
      const currentPly = explorePlyRef.current
      const fromFen = currentlyExploring
        ? (exploreBaseFen ? buildPositions(exploreBaseFen, explorePathRef.current) : [])[currentPly]
        : positions[ply]
      if (!fromFen) return false

      // Validated as a real replay from the current position rather than
      // trusted as-is — the line's moves were computed for whatever
      // position the engine had last finished searching, which callers
      // guard against being stale (see the field's own comment), but
      // replaying here is what actually stops a line at the first move
      // that doesn't apply instead of corrupting the explore path with an
      // illegal one.
      const chess = new Chess(fromFen)
      const validSan: string[] = []
      for (const san of sanMoves) {
        let move
        try {
          move = chess.move(san)
        } catch {
          break
        }
        if (!move) break
        validSan.push(move.san)
      }
      if (validSan.length === 0) return false

      // Queues the line onto the branch without jumping to its end — the
      // point is to step through it one move at a time via the ◀/▶ nav
      // (already explore-path-aware, see `BoardNavControls`), watching each
      // move land individually, not to land straight on the final position.
      if (currentlyExploring) {
        setExplorePath((prev) => [...prev.slice(0, currentPly), ...validSan])
      } else {
        setExploreBaseFen(positions[ply])
        setExplorePath(validSan)
        setExplorePly(0)
        setExploring(true)
      }
      return true
    },
    [exploring, exploreBaseFen, positions, ply],
  )

  const resetExploreLine = useCallback(() => {
    setExplorePath([])
    setExplorePly(0)
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
        exploring,
        explorePath,
        explorePly,
        explorePositions,
        displayFen,
        startExploring,
        exitExploring,
        setExplorePly,
        attemptExploreMove,
        playExploreLine,
        resetExploreLine,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}

interface LiveAnalysisContextValue {
  /** The engine's top `MULTI_PV` candidate lines for `fen` below — null until
   *  the first search completes. */
  lines: EngineLine[] | null
  /** Which position `lines` was actually computed for. A search in flight
   *  lags `displayFen` by up to `MOVETIME_MS` plus WASM search time, so a
   *  consumer that draws something *on the board* (the live best-move arrow,
   *  the eval bar) needs to check this against `displayFen` itself before
   *  using `lines` — otherwise a fast navigation could show an arrow for
   *  wherever the engine was last asked about, not where the board actually
   *  is now. `LiveAnalysisPanel`'s own line list doesn't need this check: it
   *  renders `lines` relative to this same `fen`, so the two always agree
   *  with each other even when both lag the board. */
  fen: string | null
  /** True whenever `lines`/`fen` don't yet reflect the latest position asked
   *  for — a search is either running or queued up behind one. Drives
   *  `LiveAnalysisPanel`'s corner spinner: the panel keeps showing the last
   *  completed lines while a new search catches up, rather than blanking
   *  out on every navigation, so this is the only signal that something is
   *  actually happening in the meantime. */
  thinking: boolean
}

const LiveAnalysisContext = createContext<LiveAnalysisContextValue | null>(null)

export function useLiveAnalysisContext(): LiveAnalysisContextValue {
  const ctx = useContext(LiveAnalysisContext)
  if (!ctx) throw new Error('Must be used within <LiveAnalysisProvider>')
  return ctx
}

// Fewer lines and a shorter search than the batch "Analyze" pass
// (`GameAnalysisPanel`) — this re-searches on every ply/explore step instead
// of once per game, so it needs to feel responsive rather than exhaustive.
const LIVE_MULTI_PV = 3
const LIVE_MOVETIME_MS = 600

/**
 * Owns the continuous MultiPV engine search behind both `LiveAnalysisPanel`
 * (the line list) and `BoardView`'s live eval bar / best-move arrow — one
 * engine instance and search queue shared by both consumers, kept live for
 * `displayFen` (recorded ply or explored branch) alike. Defined here rather
 * than in LiveAnalysisPanel.tsx because it needs `useBoardContext()`, and
 * `BoardView` needs its `lines` — either direction of a cross-file import
 * between the two would be circular.
 */
export function LiveAnalysisProvider({ children }: { children: React.ReactNode }) {
  const { displayFen } = useBoardContext()
  // `thinking: true` from the start — the effect below fires its first
  // search essentially immediately on mount, so defaulting to `false` here
  // would just be a one-frame flash before it flips.
  const [state, setState] = useState<LiveAnalysisContextValue>({
    lines: null,
    fen: null,
    thinking: true,
  })

  // Bridges the fen-change effect below into the engine-owning effect's own
  // request queue, rather than two effects independently reading/writing a
  // shared ref — a dev-only Strict Mode remount then can't leave a drain
  // loop `await`-ing a promise from an already-terminated engine instance
  // (that Worker never emits another message, so the loop would hang
  // forever instead of picking up the fresh instance). Each mount of the
  // effect below gets its own engine *and* its own closed-over queue state,
  // so there's nothing for an old and a new instance to share.
  const requestRef = useRef<(fen: string) => void>(() => {})

  useEffect(() => {
    const engine = new StockfishEngine()
    let cancelled = false
    // ponytail: never more than one search in flight — if the position
    // moves on again before the current search resolves, only the latest
    // requested FEN gets re-run once the engine is free, rather than
    // queuing every intermediate position or teaching StockfishEngine a
    // `stop` command just for this.
    let pendingFen: string | null = null
    let busy = false

    async function drain() {
      busy = true
      while (pendingFen && !cancelled) {
        const fen = pendingFen
        pendingFen = null
        const lines = await engine.evaluateLines(fen, LIVE_MULTI_PV, LIVE_MOVETIME_MS)
        // Still thinking if a newer request already came in while this
        // search ran — the loop picks it up next iteration instead of
        // applying this now-stale result.
        if (!cancelled && !pendingFen) setState({ lines, fen, thinking: false })
      }
      busy = false
    }

    requestRef.current = (fen) => {
      pendingFen = fen
      setState((prev) => ({ ...prev, thinking: true }))
      if (!busy) drain()
    }

    return () => {
      cancelled = true
      engine.terminate()
    }
  }, [])

  useEffect(() => {
    requestRef.current(displayFen)
  }, [displayFen])

  return <LiveAnalysisContext.Provider value={state}>{children}</LiveAnalysisContext.Provider>
}

/** Toggles free-move exploration on and off — see `BoardContextValue`'s
 *  `exploring` comment. Sits next to `AnalyzeButton` in the game page header,
 *  same "button up top, results live wherever they're relevant" split as
 *  that button's own dialog. */
export function ExploreToggleButton() {
  const { exploring, startExploring, exitExploring } = useBoardContext()
  const s = getStrings()
  return (
    <button
      onClick={exploring ? exitExploring : startExploring}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
        exploring ? 'border-accent bg-accent/20 text-white' : 'border-zinc-700 hover:bg-zinc-800'
      }`}
    >
      {exploring ? s.liveAnalysis.exitExplore : s.liveAnalysis.explore}
    </button>
  )
}

export function BoardNavControls() {
  const {
    ply,
    setPly,
    lastPly,
    movesSan,
    evals,
    boardOrientation,
    exploring,
    explorePath,
    explorePly,
    setExplorePly,
  } = useBoardContext()
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

  // While exploring, these step through the *explore* path instead of the
  // recorded game — same buttons/keyboard shortcuts, just repointed at
  // whichever sequence the board is currently showing, rather than adding a
  // second row of nav controls just for exploration.
  const displayPly = exploring ? explorePly : ply
  const displayLastPly = exploring ? explorePath.length : lastPly

  const goToStart = useCallback(() => {
    setIsPlaying(false)
    if (exploring) setExplorePly(0)
    else setPly(0)
  }, [setPly, exploring, setExplorePly])
  const goToPrevious = useCallback(() => {
    setIsPlaying(false)
    if (exploring) setExplorePly((p) => Math.max(0, p - 1))
    else setPly((p) => Math.max(0, p - 1))
  }, [setPly, exploring, setExplorePly])
  const goToNext = useCallback(() => {
    setIsPlaying(false)
    if (exploring) setExplorePly((p) => Math.min(explorePath.length, p + 1))
    else setPly((p) => Math.min(lastPly, p + 1))
  }, [setPly, lastPly, exploring, setExplorePly, explorePath.length])
  const goToEnd = useCallback(() => {
    setIsPlaying(false)
    if (exploring) setExplorePly(explorePath.length)
    else setPly(lastPly)
  }, [setPly, lastPly, exploring, setExplorePly, explorePath.length])
  // Auto-play (with its blunder-stopping logic below) is a recorded-game
  // feature only — there's no engine-flagged "blunder" to stop on for a
  // free-explored line, so this is simply a no-op while exploring; the
  // button itself is also disabled in that state (see the JSX below).
  const togglePlaying = useCallback(() => {
    if (exploring) return
    if (isPlayingRef.current) {
      setIsPlaying(false)
      return
    }
    if (plyRef.current >= lastPly) setPly(0) // restart from the beginning if already at the end
    setIsPlaying(true)
  }, [lastPly, setPly, exploring])

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

  // Every ply that's a blunder (200cp+ swing) on the account's own move —
  // same definition (and same "own moves only" scoping) findBlunders() plus
  // GameAnalysisPanel's filter already use for the analysis dialog/blunders
  // page, reused here as "auto-play's stopping points" instead of a
  // separate notion of what counts as relevant. `boardOrientation` stands in
  // for "my color" — game replay pages (the only callers with `evals`) fix
  // it to the synced player's color for the whole session and never offer a
  // flip control. `undefined` (unanalyzed game) just means autoplay has
  // nothing to stop for except the end.
  const blunderPlies = useMemo(
    () =>
      evals
        ? new Set(
            findBlunders(evals, movesSan)
              .filter((b) => whiteToMove(b.ply) === (boardOrientation === 'white'))
              .map((b) => b.ply),
          )
        : null,
    [evals, movesSan, boardOrientation],
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
      <NavButton onClick={goToStart} disabled={displayPly === 0} label={s.board.navLabels.start}>
        ⏮
      </NavButton>
      <NavButton
        onClick={goToPrevious}
        disabled={displayPly === 0}
        label={s.board.navLabels.previous}
      >
        ◀
      </NavButton>
      <span className="min-w-16 text-center text-zinc-400 tabular-nums">
        {displayPly} / {displayLastPly}
      </span>
      <NavButton
        onClick={goToNext}
        disabled={displayPly === displayLastPly}
        label={s.board.navLabels.next}
      >
        ▶
      </NavButton>
      <NavButton
        onClick={goToEnd}
        disabled={displayPly === displayLastPly}
        label={s.board.navLabels.end}
      >
        ⏭
      </NavButton>
      <span className="mx-1 h-4 w-px bg-zinc-700" />
      <button
        onClick={togglePlaying}
        disabled={lastPly === 0 || exploring}
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
  const {
    ply,
    positions,
    boardOrientation,
    result,
    movesSan,
    evals,
    setPly,
    hiddenFindingKeys,
    exploring,
    explorePly,
    displayFen,
    exitExploring,
    attemptExploreMove,
  } = useBoardContext()
  const s = getStrings()
  const { lines: liveLines, fen: liveFen } = useLiveAnalysisContext()
  // Eval bar: always the latest completed search's top line, even if a newer
  // search (for wherever the board has since moved to) hasn't finished yet —
  // briefly showing the *previous* position's number beats the bar blinking
  // out and back in on every single move/step, which is what gating this on
  // `liveFen === displayFen` (like the arrow below) used to do.
  const liveEval: PositionEval | undefined = liveLines?.[0]
    ? { cp: liveLines[0].cp, mate: liveLines[0].mate, bestMove: null }
    : undefined
  // Saved batch analysis wins when it exists and the board is showing the
  // recorded game (instant on load, no waiting on a fresh search) — the live
  // line is the fallback for an unanalyzed game, and the *only* source while
  // exploring, since a saved eval only ever covers the recorded ply, never a
  // free-explored position.
  const barEval = exploring ? liveEval : (evals?.[ply] ?? liveEval)
  // Best-move arrow: unlike the bar above, a stale arrow would point at the
  // *wrong squares* on the position now on screen, not just show a slightly
  // outdated number — worth the (much shorter, same-tick) gap where no live
  // arrow shows rather than a momentarily wrong one.
  const liveLine = liveFen === displayFen ? (liveLines?.[0] ?? undefined) : undefined
  // react-chessboard needs a unique `id` per instance — without one, two
  // simultaneous boards on the same page (this one plus a PlanBoard showing
  // the suggested move's plan) collide on shared DOM ids internally and
  // crash with "Square width not found".
  const boardId = useId()
  // Only surface the engine's suggestion (reveal arrow, "better was" text,
  // and its "Show" plan dialog) when it's a move for the user's
  // own color to play next — same "own moves only" scoping GameAnalysisPanel
  // already applies to the blunder list. `boardOrientation` stands in for
  // "my color" (see blunderPlies below); an opponent's/bot's best move isn't
  // useful to review. Also suppressed entirely while exploring — it's tied to
  // the *recorded* ply's saved analysis, which no longer matches whatever
  // free-explored position the board is actually showing.
  const bestMove =
    !exploring && whiteToMove(ply + 1) === (boardOrientation === 'white')
      ? evals?.[ply]?.bestMove
      : undefined

  // Click/drag-to-move while exploring — same selected-square + legal-move-dot
  // pattern `RepertoireBoard` uses, minus the persistence: a move here only
  // ever updates in-memory explore state (`attemptExploreMove`).
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const legalMoves = useMemo(
    () => (exploring && selectedSquare ? legalDestinations(displayFen, selectedSquare) : []),
    [exploring, selectedSquare, displayFen],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  function handleExploreDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string
    targetSquare: string | null
  }): boolean {
    if (!targetSquare) return false
    return attemptExploreMove(sourceSquare, targetSquare)
  }

  function handleExploreSquareClick({ square, piece }: { square: string; piece: unknown | null }) {
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null)
        return
      }
      const moved = attemptExploreMove(selectedSquare, square)
      setSelectedSquare(!moved && piece ? square : null)
      return
    }
    if (piece) setSelectedSquare(square)
  }

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
  // Merge with the engine's own suggested-move arrows, deduped the same way —
  // react-chessboard keys each arrow by its start/end squares alone (not by
  // color), so a checklist arrow landing on the exact same two squares as a
  // reveal arrow would otherwise hand it two arrows sharing one key. Two
  // different reveal arrows can be in play at once here: `bestMove` (the
  // *saved* batch analysis's suggestion, own-color-only, tied to the
  // blunder-coaching "better was" text below) and `liveLine` (the live
  // engine's current top line, shown for either color, in both replay and
  // exploring — see `barEval`'s comment above for why the two arrows can
  // point at different moves when the live search hasn't caught up yet).
  // The live arrow wins when they collide: it's the freshest read of the
  // position actually on screen.
  const boardArrows = useMemo(() => {
    const arrows = new Map<string, { startSquare: string; endSquare: string; color: string }>()
    if (!exploring) {
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
    }
    if (liveLine) {
      arrows.set(`${liveLine.move.from}-${liveLine.move.to}`, {
        startSquare: liveLine.move.from,
        endSquare: liveLine.move.to,
        color: REVEAL_ARROW_COLOR,
      })
    }
    return [...arrows.values()]
  }, [checklistSquareStyles.arrows, bestMove, exploring, liveLine])
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
  // (Start/End, clicking a move further down the list, playing a whole
  // engine line onto the explore branch then jumping into it, or clicking a
  // move in the "your line" strip), which reads as a flicker/blink rather
  // than a clean cut. Only animate the adjacent case; swap instantly for
  // everything else — `navPly` is `explorePly` while exploring, `ply`
  // otherwise, so this covers both nav systems the same way; switching
  // between the two modes is treated as non-adjacent too, since the two
  // numbering spaces don't mean anything compared against each other.
  // `prevNavPly`/`prevExploring` are updated during render (React's
  // documented "adjust state when a prop changes" pattern) rather than a
  // ref, so the comparison stays render-safe instead of reading
  // ref.current mid-render.
  const navPly = exploring ? explorePly : ply
  const [prevNavPly, setPrevNavPly] = useState(navPly)
  const [prevExploring, setPrevExploring] = useState(exploring)
  const [isAdjacentStep, setIsAdjacentStep] = useState(false)
  if (navPly !== prevNavPly || exploring !== prevExploring) {
    setIsAdjacentStep(exploring === prevExploring && Math.abs(navPly - prevNavPly) === 1)
    setPrevNavPly(navPly)
    setPrevExploring(exploring)
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      <div className={`flex w-full shrink-0 flex-col gap-3 ${boardMaxWidthClassName}`}>
        <div className="flex items-stretch gap-2">
          {barEval && <EvalBar evaluation={barEval} boardOrientation={boardOrientation} />}
          <div className={`w-full overflow-hidden rounded shadow-lg ${boardMaxWidthClassName}`}>
            <Chessboard
              options={{
                id: boardId,
                position: displayFen,
                boardOrientation,
                allowDragging: exploring,
                onPieceDrop: exploring ? handleExploreDrop : undefined,
                onSquareClick: exploring ? handleExploreSquareClick : undefined,
                // squareRenderer takes over a square's background entirely
                // (react-chessboard only auto-applies squareStyles when it's
                // absent) — used only while exploring, for the legal-move
                // dots; the checklist's squareStyles below is what draws
                // outside exploration instead.
                squareRenderer: exploring
                  ? ({ square, children }) => (
                      <LegalMoveSquare
                        isSelected={square === selectedSquare}
                        isLegalMove={legalMoveMap.has(square)}
                        isCapture={legalMoveMap.get(square) ?? false}
                      >
                        {children}
                      </LegalMoveSquare>
                    )
                  : undefined,
                showAnimations: isAdjacentStep,
                animationDurationInMs: BOARD_ANIMATION_DURATION_MS,
                darkSquareStyle: { backgroundColor: BOARD_DARK_SQUARE },
                lightSquareStyle: { backgroundColor: BOARD_LIGHT_SQUARE },
                darkSquareNotationStyle: BOARD_DARK_SQUARE_NOTATION_STYLE,
                lightSquareNotationStyle: BOARD_LIGHT_SQUARE_NOTATION_STYLE,
                alphaNotationStyle: BOARD_NOTATION_SIZE_STYLE,
                numericNotationStyle: BOARD_NOTATION_SIZE_STYLE,
                squareStyles: exploring ? undefined : checklistSquareStyles.styles,
                arrows: boardArrows,
              }}
            />
          </div>
        </div>
        <p className="text-xs text-zinc-400">
          {s.board.material} {formatMaterialDiff(materialDiff(displayFen))}
          {barEval && (
            <>
              {' '}
              · {describeEval(barEval)} ({formatEval(barEval)})
            </>
          )}
        </p>
        {betterMove && (
          // A <div>, not <p> — <dialog> (PlanBoardButton's, opened from
          // here) is block-level and HTML forbids block content inside <p>,
          // which React's hydration check enforces.
          <div className="text-xs text-amber-400">
            {s.common.betterWas} {betterMove}
            {bestMove && bestMove.bestLine?.length > 0 && (
              <PlanBoardButton
                key={ply}
                betterMove={betterMove}
                fenBefore={positions[ply]}
                moves={[bestMove.san, ...bestMove.bestLine]}
                boardOrientation={boardOrientation}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-4 lg:max-w-sm lg:flex-1 xl:max-w-md">
        <MoveList
          movesSan={movesSan}
          ply={ply}
          onSelect={(p) => {
            // Clicking a recorded move while exploring reads as "go back to
            // the actual game here" — exit exploration rather than leaving
            // the board showing an explored position next to a move-list
            // selection that no longer matches it.
            if (exploring) exitExploring()
            setPly(p)
          }}
          result={result}
        />
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
