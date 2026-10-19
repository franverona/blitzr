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
import { BoardCoordinates } from './BoardCoordinates'
import { describeEval, findBlunders, formatEval } from '@/lib/analysis'
import { buildPositionChecklist, findingKey, findingMarks } from '@/lib/checklist'
import { whiteToMove } from '@/lib/drill'
import { gameEndBadges, type GameEndVariant } from '@/lib/gameEnd'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { formatMaterialDiff, materialDiff } from '@/lib/material'
import { buildPositions } from '@/lib/positions'
import { StockfishEngine } from '@/lib/stockfish/client'
import { describeBetterMove } from '@/lib/tactics'
import {
  BOARD_ANIMATION_DURATION_MS,
  CHECKLIST_ARROW_COLOR,
  CHECKLIST_SQUARE_COLOR,
  GAME_END_SQUARE_COLORS,
  REVEAL_ARROW_COLOR,
} from '@/lib/theme'
import type { EngineLine, PositionEval } from '@/lib/types'
import { useSettings, useMoveSound } from './SettingsProvider'
import { EvalBar } from './EvalBar'
import { LegalMoveSquare } from './LegalMoveSquare'
import { MoveList } from './MoveList'
import { PlanBoardButton } from './PlanBoard'

interface BoardContextValue {
  ply: number
  setPly: (updater: number | ((ply: number) => number)) => void
  positions: string[]
  lastPly: number
  /** The user's side: auto-play stops, saved hints and "your move" checks.
   *  Fixed, unlike `boardOrientation`, so flipping the board can't change it. */
  myColor: 'white' | 'black'
  boardOrientation: 'white' | 'black'
  setBoardOrientation: (
    updater: 'white' | 'black' | ((o: 'white' | 'black') => 'white' | 'black'),
  ) => void
  result?: string
  /** Per-player result codes, for end badges the final position can't show
   *  (resignation, timeout, agreed draw). */
  finalResults?: { white: string; black: string }
  movesSan: string[]
  evals?: PositionEval[]
  /** Checklist findings the user has hidden from the board (`findingKey()`). */
  hiddenFindingKeys: Set<string>
  toggleFindingVisibility: (key: string) => void
  /** Free-move exploration branch, kept separate from the recorded game's
   *  `ply`/`positions` — it never persists and is discarded on exit. */
  exploring: boolean
  /** SAN moves played since `startExploring()`. */
  explorePath: string[]
  explorePly: number
  /** `explorePositions[0]` is the branch point, before `explorePath[0]`. */
  explorePositions: string[]
  /** The FEN the board renders: `positions[ply]`, or the explore step while
   *  exploring. Read this instead of `positions[ply]` to draw a position. */
  displayFen: string
  startExploring: () => void
  exitExploring: () => void
  setExplorePly: (updater: number | ((ply: number) => number)) => void
  /** Always promotes to queen. Truncates any explored moves past the current
   *  explore ply. Returns whether the move was legal. */
  attemptExploreMove: (from: string, to: string) => boolean
  /** Appends a SAN line to the explore branch (entering explore mode if
   *  needed) without moving `explorePly`, so ◀/▶ can step through it. Stops at
   *  the first move that no longer applies. Returns false if nothing applied. */
  playExploreLine: (sanMoves: string[]) => boolean
  /** Clears the explored moves and returns to ply 0 without leaving explore mode. */
  resetExploreLine: () => void
}

const BoardContext = createContext<BoardContextValue | null>(null)

const PLAY_INTERVAL_MS = 500

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('Must be used within <BoardProvider>')
  return ctx
}

export function BoardProvider({
  initialFen,
  movesSan,
  boardOrientation: initialBoardOrientation,
  myColor = initialBoardOrientation,
  result,
  finalResults,
  evals,
  initialPly,
  children,
}: {
  initialFen: string
  movesSan: string[]
  boardOrientation: 'white' | 'black'
  /** Defaults to `boardOrientation`. */
  myColor?: 'white' | 'black'
  result?: string
  finalResults?: { white: string; black: string }
  evals?: PositionEval[]
  /** Defaults to the last ply. */
  initialPly?: number
  children: React.ReactNode
}) {
  const positions = useMemo(() => buildPositions(initialFen, movesSan), [initialFen, movesSan])
  const lastPly = positions.length - 1
  // Clamped: a synced game can have zero parsed moves.
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
  // Refs mirror the state above so two explore moves fired faster than a render
  // don't both compute "the current position" from the same stale closure.
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

      // Replayed rather than trusted: the line may be stale for this position.
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
        myColor,
        boardOrientation,
        setBoardOrientation,
        result,
        finalResults,
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
  /** null until the first search completes. */
  lines: EngineLine[] | null
  /** The position `lines` was computed for. Searches lag `displayFen`, so
   *  anything drawn on the board must check this against `displayFen`. */
  fen: string | null
  /** A search is running or queued. */
  thinking: boolean
}

const LiveAnalysisContext = createContext<LiveAnalysisContextValue | null>(null)

// Same value a provider exposes before its first result.
const NO_LIVE_ANALYSIS: LiveAnalysisContextValue = { lines: null, fen: null, thinking: false }

/** Doesn't throw without a provider: `/learn` renders `BoardView` without one
 *  to avoid spinning up an engine Worker for a hand-authored line. */
export function useLiveAnalysisContext(): LiveAnalysisContextValue {
  return useContext(LiveAnalysisContext) ?? NO_LIVE_ANALYSIS
}

// Re-searches on every step, so it trades depth for responsiveness.
const LIVE_MULTI_PV = 3
const LIVE_MOVETIME_MS = 600

/**
 * Owns the live MultiPV search shared by `LiveAnalysisPanel` and `BoardView`.
 * Lives here rather than in LiveAnalysisPanel.tsx to avoid a circular import.
 */
export function LiveAnalysisProvider({ children }: { children: React.ReactNode }) {
  const { displayFen } = useBoardContext()
  const [state, setState] = useState<LiveAnalysisContextValue>({
    lines: null,
    fen: null,
    thinking: true,
  })

  // Engine and request queue are created in the same effect so a Strict Mode
  // remount can't leave a drain loop awaiting a terminated Worker.
  const requestRef = useRef<(fen: string) => void>(() => {})

  useEffect(() => {
    const engine = new StockfishEngine()
    let cancelled = false
    // ponytail: at most one search in flight; only the latest requested FEN
    // runs next, intermediate positions are dropped.
    let pendingFen: string | null = null
    let busy = false

    async function drain() {
      busy = true
      try {
        while (pendingFen && !cancelled) {
          const fen = pendingFen
          pendingFen = null
          const lines = await engine.evaluateLines(fen, LIVE_MULTI_PV, LIVE_MOVETIME_MS)
          // Skip a result that a newer request has already superseded.
          if (!cancelled && !pendingFen) setState({ lines, fen, thinking: false })
        }
      } catch {
        // Worker died — clear the spinner.
        pendingFen = null
        if (!cancelled) setState((prev) => ({ ...prev, thinking: false }))
      } finally {
        busy = false
      }
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

export function ExploreToggleButton() {
  const { exploring, startExploring, exitExploring } = useBoardContext()
  const s = getStrings()
  return (
    <button
      onClick={exploring ? exitExploring : startExploring}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
        exploring
          ? 'border-accent bg-accent/20 text-zinc-900 dark:text-white'
          : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
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
    positions,
    evals,
    myColor,
    exploring,
    explorePath,
    explorePly,
    setExplorePly,
    setBoardOrientation,
  } = useBoardContext()
  const s = getStrings()
  const [isPlaying, setIsPlaying] = useState(false)

  // Refs let the interval/keydown callbacks read fresh values without
  // re-subscribing, and keep setPly out of setIsPlaying's updater (React warns
  // about updating another component's state during render).
  const plyRef = useRef(ply)
  const isPlayingRef = useRef(isPlaying)
  useEffect(() => {
    plyRef.current = ply
    isPlayingRef.current = isPlaying
  })

  // While exploring, nav steps through the explore path instead.
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
  // Auto-play stops on blunders, so it only applies to the recorded game.
  const togglePlaying = useCallback(() => {
    if (exploring) return
    if (isPlayingRef.current) {
      setIsPlaying(false)
      return
    }
    if (plyRef.current >= lastPly) setPly(0)
    setIsPlaying(true)
  }, [lastPly, setPly, exploring])

  // ←/→ step, Home/↑/0 and End/↓ jump, Space plays/pauses, F flips.
  const lastNavAtRef = useRef(0)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Browser/OS shortcuts win: Cmd+0 resets zoom, Cmd/Alt+← is Back.
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement) {
        if (e.target.isContentEditable || e.target.closest('input, select, textarea')) return
        // Dialogs block shortcuts unless they opt in with data-board-shortcuts.
        const dialog = e.target.closest('dialog')
        if (dialog && !dialog.hasAttribute('data-board-shortcuts')) return
      }
      // A focused button already handles Space natively; avoid toggling twice.
      if (e.key === ' ' && e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') {
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        togglePlaying()
        return
      }
      if (e.key === '0' || e.key === 'Home' || e.key === 'ArrowUp') {
        e.preventDefault()
        goToStart()
        return
      }
      if (e.key === 'End' || e.key === 'ArrowDown') {
        e.preventDefault()
        goToEnd()
        return
      }
      if (e.key.toLowerCase() === 'f') {
        setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))
        return
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      // Throttle to the animation duration so a held key doesn't cut slides
      // off mid-flight.
      const now = Date.now()
      if (now - lastNavAtRef.current < BOARD_ANIMATION_DURATION_MS) return
      lastNavAtRef.current = now
      if (e.key === 'ArrowLeft') goToPrevious()
      else goToNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goToPrevious, goToNext, goToStart, goToEnd, togglePlaying, setBoardOrientation])

  // Auto-play stops on the user's own blunders.
  const blunderPlies = useMemo(
    () =>
      evals
        ? new Set(
            findBlunders(evals, movesSan, positions[0])
              .filter((b) => whiteToMove(b.ply, positions[0]) === (myColor === 'white'))
              .map((b) => b.ply),
          )
        : null,
    [evals, movesSan, positions, myColor],
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
    <div className="flex items-center gap-2">
      <NavButton onClick={goToStart} disabled={displayPly === 0} label={s.board.navLabels.start}>
        <NavIcon d="M7 5v14M18 6l-6 6 6 6" />
      </NavButton>
      <NavButton
        onClick={goToPrevious}
        disabled={displayPly === 0}
        label={s.board.navLabels.previous}
      >
        <NavIcon d="M15 6l-6 6 6 6" />
      </NavButton>
      <NavButton
        onClick={togglePlaying}
        disabled={lastPly === 0 || exploring}
        label={isPlaying ? s.board.navLabels.pause : s.board.navLabels.play}
        active={isPlaying}
      >
        {isPlaying ? (
          <NavIcon d="M9 5v14M15 5v14" />
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </NavButton>
      <NavButton
        onClick={goToNext}
        disabled={displayPly === displayLastPly}
        label={s.board.navLabels.next}
      >
        <NavIcon d="M9 6l6 6-6 6" />
      </NavButton>
      <NavButton
        onClick={goToEnd}
        disabled={displayPly === displayLastPly}
        label={s.board.navLabels.end}
      >
        <NavIcon d="M17 5v14M6 6l6 6-6 6" />
      </NavButton>
    </div>
  )
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}

// Percent offset of a square's top-left corner, used to position the
// game-end badges.
function squarePercent(square: string, orientation: 'white' | 'black') {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0) // 0-7, a-h
  const rank = Number(square[1]) // 1-8
  const col = orientation === 'white' ? file : 7 - file
  const row = orientation === 'white' ? 8 - rank : rank - 1
  return { left: col * 12.5, top: row * 12.5 }
}

const GAME_END_BADGE_COLORS = {
  loss: 'bg-rose-600',
  flag: 'bg-rose-600',
  win: 'bg-emerald-600',
  draw: 'bg-zinc-500',
}

// Glyphs traced from chess.com's game-end badges.
function WinnerIcon() {
  return (
    <svg viewBox="0 0 18 19" width="85%" height="85%">
      <path
        fill="#fff"
        transform="matrix(0.25173118,0,0,0.25173118,2.8497971,2.8741344)"
        d="m 24.4334,39.6517 c 15.9034,0 22.8584,-4.7017 22.8584,-4.7017 l 0.975,-23.6167 c 0,-2.16663 -1.495,-2.79497 -3.25,-1.4083 L 34.1834,17.53 26.6868,2.66667 C 26.0151,0.911667 25.1484,0.5 24.5201,0.5 23.8918,0.5 22.9384,0.955 22.3534,2.66667 L 14.6834,17.53 3.85008,9.925 C 2.09508,8.53833 0.513416,9.16667 0.600083,11.3333 L 1.57508,34.95 c 0,0 6.955,4.55 22.85832,4.7017 z"
      />
    </svg>
  )
}

function MateIcon() {
  return (
    <svg viewBox="0 0 18 19" width="85%" height="85%">
      <path
        fill="#fff"
        d="m 8.91922,5.86598 c 0.27141,0 0.5622,0.28866 0.96931,0.70103 0.19387,0.20619 0.40707,0.41237 0.65917,0.63918 0,0.12371 -0.0194,0.26804 -0.0194,0.41237 H 8.70598 C 8.47334,7.30928 8.33764,6.95876 8.33764,6.60825 c 0,-0.37114 0.15509,-0.74227 0.58158,-0.74227 z m 0,6.26802 c -0.42649,0 -0.58158,-0.3711 -0.58158,-0.7422 0,-0.3506 0.1357,-0.7011 0.36834,-1.0104 h 1.82232 c 0,0.1444 0.0194,0.2887 0.0194,0.4124 -0.2521,0.2268 -0.4653,0.433 -0.65917,0.6392 -0.40711,0.4124 -0.6979,0.701 -0.96931,0.701 z M 11.3748,4.52577 C 10.6769,3.7835 9.95961,3 8.79645,3 7.14863,3 5.96607,4.23711 5.96607,5.92784 c 0,0.82474 0.17448,1.50515 0.32957,1.91752 L 5.73344,7.96907 V 7.02062 H 5.40388 4.27948 3.96931 V 8.05155 H 3.31018 3 V 8.40206 9.5979 9.9485 h 0.31018 0.65913 v 1.0309 h 0.31017 1.1244 0.32956 v -0.9485 l 0.54281,0.1237 c -0.1357,0.4124 -0.31018,1.0928 -0.31018,1.9176 0,1.6907 1.18256,2.9278 2.83038,2.9278 1.16316,0 1.88045,-0.7835 2.57835,-1.5258 0.3683,-0.3711 0.7367,-0.7629 1.1632,-1.0515 0.1357,0.4536 0.3683,0.7422 0.6979,0.9072 0.3683,0.2062 0.8142,0.2062 1.3182,0.2062 H 14.6704 15 V 13.1856 L 14.9935,4.81443 V 4.46392 H 14.664 14.5477 c -0.5041,0 -0.95,0 -1.3183,0.20618 C 12.8998,4.83505 12.6672,5.12371 12.5315,5.57732 12.105,5.28866 11.7367,4.89691 11.3683,4.52577 Z"
      />
    </svg>
  )
}

function DrawIcon() {
  return (
    <svg viewBox="0 0 18 19" width="85%" height="85%">
      <path d="M2.92,7V5.84c.81,0,1.75-.28,1.8-1.22H6.14v5.5H4.34V7Zm8.87-2.39L7,13.88H5l4.8-9.26ZM9.85,13.88c-.08-1.54,1.38-2.19,2.57-2.89.33-.17.78-.4.78-.78a.66.66,0,0,0-.68-.7c-.69,0-.94.58-.92,1.16H10a2.17,2.17,0,0,1,.64-1.79,2.74,2.74,0,0,1,1.91-.62C14.1,8.26,15,8.78,15,10c0,1.82-2.66,2.18-2.66,2.5h2.73v1.38Z" />
      {/* White copy shifted up ~0.5px for an embossed look. */}
      <path
        fill="#fff"
        d="M2.92,6.51V5.34c.81,0,1.75-.28,1.8-1.22H6.14v5.5H4.34V6.51Zm8.87-2.39L7,13.38H5l4.8-9.26ZM9.85,13.38c-.08-1.54,1.38-2.19,2.57-2.89.33-.17.78-.4.78-.78a.66.66,0,0,0-.68-.7c-.69,0-.94.58-.92,1.16H10a2.17,2.17,0,0,1,.64-1.79,2.74,2.74,0,0,1,1.91-.62C14.1,7.76,15,8.28,15,9.5c0,1.82-2.66,2.18-2.66,2.5h2.73v1.38Z"
      />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 18 19" width="70%" height="70%">
      <path fill="#fff" d="M4 2.5h1.6v14H4zM6.4 3.2h8.1l-2 3.3 2 3.3H6.4z" />
    </svg>
  )
}

const GAME_END_BADGE_ICONS = { loss: MateIcon, flag: FlagIcon, win: WinnerIcon, draw: DrawIcon }

function GameEndBadge({
  square,
  label,
  variant,
  boardOrientation,
}: {
  square: string
  label: string
  variant: GameEndVariant
  boardOrientation: 'white' | 'black'
}) {
  const { left, top } = squarePercent(square, boardOrientation)
  const Icon = GAME_END_BADGE_ICONS[variant]
  return (
    <div
      role="img"
      aria-label={label}
      className={`pointer-events-none absolute z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${GAME_END_BADGE_COLORS[variant]}`}
      style={{
        // Straddles the square's top-right corner. Positioned against the
        // outer wrapper, not the clipped board, so back-rank badges aren't cut off.
        left: `${left + 12.5}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <Icon />
    </div>
  )
}

export function BoardView({
  boardMaxWidthClassName = 'max-w-160',
  sidebarMaxWidthClassName = 'lg:max-w-sm xl:max-w-md',
  sidebarExtra,
}: {
  boardMaxWidthClassName?: string
  /** The game page narrows it so its nav controls span the whole row. */
  sidebarMaxWidthClassName?: string
  /** Content below the move list. Keep it short — the move list fills the
   *  remaining height. */
  sidebarExtra?: React.ReactNode
} = {}) {
  const {
    ply,
    positions,
    myColor,
    boardOrientation,
    result,
    finalResults,
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
  const boardColors = useSettings()
  const { lines: liveLines, fen: liveFen } = useLiveAnalysisContext()
  useMoveSound(displayFen)
  // The eval bar uses the latest completed search even if it's for the
  // previous position, so it doesn't blink on every step.
  const liveEval: PositionEval | undefined = liveLines?.[0]
    ? { cp: liveLines[0].cp, mate: liveLines[0].mate, bestMove: null }
    : undefined
  // Saved analysis wins on the recorded game; live is the fallback and the
  // only source while exploring.
  const barEval = exploring ? liveEval : (evals?.[ply] ?? liveEval)
  // Unlike the bar, a stale arrow would point at the wrong squares.
  const liveLine =
    !boardColors.hideEngineHints && liveFen === displayFen
      ? (liveLines?.[0] ?? undefined)
      : undefined
  // Unique id required: two boards on one page (this + PlanBoard) crash otherwise.
  const boardId = useId()
  // Saved suggestion only for the user's own moves, and not while exploring
  // (it belongs to the recorded ply).
  const bestMove =
    !exploring && whiteToMove(ply + 1, positions[0]) === (myColor === 'white')
      ? evals?.[ply]?.bestMove
      : undefined

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

  const checklistSquareStyles = useMemo(() => {
    const findings = buildPositionChecklist(positions[ply]).filter(
      (f) => !hiddenFindingKeys.has(findingKey(f)),
    )
    const styles: Record<string, React.CSSProperties> = {}
    // react-chessboard keys arrows by start/end square, so dedupe.
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
  // Same dedupe as above. The live arrow wins over the saved one on collision.
  const boardArrows = useMemo(() => {
    const arrows = new Map<string, { startSquare: string; endSquare: string; color: string }>()
    if (!exploring) {
      for (const arrow of checklistSquareStyles.arrows) {
        arrows.set(`${arrow.startSquare}-${arrow.endSquare}`, arrow)
      }
      if (bestMove && !boardColors.hideEngineHints) {
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
  }, [checklistSquareStyles.arrows, bestMove, exploring, liveLine, boardColors.hideEngineHints])

  // The position shows mate/draw itself; resignations and timeouts (most
  // games) only get a badge on the recorded final ply.
  const gameEndBadgeList = useMemo(() => {
    const atRecordedEnd = !exploring && ply === positions.length - 1
    const kings = new Map(
      new Chess(displayFen)
        .board()
        .flat()
        .flatMap((cell) =>
          cell?.type === 'k'
            ? [[cell.color === 'w' ? 'white' : 'black', cell.square] as const]
            : [],
        ),
    )
    return gameEndBadges(displayFen, atRecordedEnd ? finalResults : undefined).flatMap((b) => {
      const square = kings.get(b.color)
      return square ? [{ square, variant: b.variant, label: s.board.endReasons[b.reason] }] : []
    })
  }, [displayFen, exploring, ply, positions.length, finalResults, s])
  const boardSquareStyles = useMemo(() => {
    const styles = { ...checklistSquareStyles.styles }
    for (const badge of gameEndBadgeList) {
      styles[badge.square] = { backgroundColor: GAME_END_SQUARE_COLORS[badge.variant] }
    }
    return styles
  }, [checklistSquareStyles.styles, gameEndBadgeList])
  const betterMove = bestMove
    ? describeBetterMove(
        positions[ply],
        movesSan[ply] ?? '',
        bestMove,
        whiteToMove(ply + 1, positions[0]) ? 'white' : 'black',
      )
    : null

  // Only animate single-step moves; multi-ply jumps flicker. Switching between
  // recorded and explore modes counts as a jump.
  const navPly = exploring ? explorePly : ply
  const [prevNavPly, setPrevNavPly] = useState(navPly)
  const [prevExploring, setPrevExploring] = useState(exploring)
  const [isAdjacentStep, setIsAdjacentStep] = useState(false)
  if (navPly !== prevNavPly || exploring !== prevExploring) {
    setIsAdjacentStep(exploring === prevExploring && Math.abs(navPly - prevNavPly) === 1)
    setPrevNavPly(navPly)
    setPrevExploring(exploring)
  }

  // At lg+, pin the sidebar to the board column's measured height so the move
  // list fills it. CSS stretch can't: the list's own content would drive the row.
  const boardColumnRef = useRef<HTMLDivElement>(null)
  const [sidebarHeight, setSidebarHeight] = useState<number | undefined>(undefined)
  useEffect(() => {
    const el = boardColumnRef.current
    if (!el) return
    const query = window.matchMedia('(min-width: 1024px)')
    const measure = () =>
      setSidebarHeight(query.matches ? el.getBoundingClientRect().height : undefined)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    query.addEventListener('change', measure)
    return () => {
      observer.disconnect()
      query.removeEventListener('change', measure)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      <div
        ref={boardColumnRef}
        className={`flex w-full shrink-0 flex-col gap-3 ${boardMaxWidthClassName}`}
      >
        <div className="flex items-stretch gap-2">
          {barEval && !boardColors.hideEngineHints && (
            <EvalBar
              evaluation={barEval}
              boardOrientation={boardOrientation}
              className={boardColors.showCoordinates ? 'mb-7' : ''}
            />
          )}
          <BoardCoordinates
            show={boardColors.showCoordinates}
            orientation={boardOrientation}
            className="w-full min-w-0"
          >
            <div className={`relative w-full ${boardMaxWidthClassName}`}>
              <div className="w-full overflow-hidden rounded shadow-lg">
                <Chessboard
                  options={{
                    id: boardId,
                    position: displayFen,
                    boardOrientation,
                    allowDragging: exploring,
                    onPieceDrop: exploring ? handleExploreDrop : undefined,
                    onSquareClick: exploring ? handleExploreSquareClick : undefined,
                    // squareRenderer overrides squareStyles, so only use it while exploring.
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
                    darkSquareStyle: { backgroundColor: boardColors.dark },
                    lightSquareStyle: { backgroundColor: boardColors.light },
                    showNotation: false,
                    squareStyles: exploring ? undefined : boardSquareStyles,
                    arrows: boardArrows,
                  }}
                />
              </div>
              {gameEndBadgeList.map((badge) => (
                <GameEndBadge
                  key={`${badge.variant}-${badge.square}`}
                  square={badge.square}
                  label={badge.label}
                  variant={badge.variant}
                  boardOrientation={boardOrientation}
                />
              ))}
            </div>
          </BoardCoordinates>
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
          // <div>, not <p>: PlanBoardButton renders a <dialog>, invalid inside <p>.
          <div className="text-xs text-amber-600 dark:text-amber-400">
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

      <div
        className={`flex min-h-0 w-full flex-col gap-4 lg:flex-1 ${sidebarMaxWidthClassName}`}
        style={sidebarHeight ? { height: sidebarHeight } : undefined}
      >
        <MoveList
          movesSan={movesSan}
          ply={ply}
          onSelect={(p) => {
            // Clicking a recorded move leaves explore mode.
            if (exploring) exitExploring()
            setPly(p)
          }}
          result={result}
          evals={evals}
          positions={positions}
          myColor={myColor}
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
  active = false,
  children,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-10 min-w-14 flex-1 items-center justify-center rounded-lg border disabled:opacity-40 ${
        active
          ? 'border-accent bg-accent/20 text-zinc-900 dark:text-white'
          : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}
