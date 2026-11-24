'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { buildPositions } from '@/lib/positions'
import type { PositionEval } from '@/lib/types'
import type { PromotionPiece } from './PromotionPicker'

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
  /** Free-move exploration branch, kept separate from the recorded game's
   *  `ply`/`positions` — it never persists and is discarded on exit. */
  exploring: boolean
  /** SAN moves played since entering explore mode. */
  explorePath: string[]
  explorePly: number
  /** `explorePositions[0]` is the branch point, before `explorePath[0]`. */
  explorePositions: string[]
  /** The FEN the board renders: `positions[ply]`, or the explore step while
   *  exploring. Read this instead of `positions[ply]` to draw a position. */
  displayFen: string
  exitExploring: () => void
  setExplorePly: (updater: number | ((ply: number) => number)) => void
  /** Promotes to `promotion` (default queen). Truncates any explored moves
   *  past the current explore ply, or enters explore mode from the current
   *  ply. Returns whether the move was legal. */
  attemptExploreMove: (from: string, to: string, promotion?: PromotionPiece) => boolean
  /** Appends a SAN line to the explore branch (entering explore mode if
   *  needed) without moving `explorePly`, so ◀/▶ can step through it. Stops at
   *  the first move that no longer applies. Returns false if nothing applied. */
  playExploreLine: (sanMoves: string[]) => boolean
  /** Clears the explored moves and returns to ply 0 without leaving explore mode. */
  resetExploreLine: () => void
}

const BoardContext = createContext<BoardContextValue | null>(null)

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

  const exitExploring = useCallback(() => {
    setExploring(false)
    setExploreBaseFen(null)
    setExplorePath([])
    setExplorePly(0)
  }, [])

  const attemptExploreMove = useCallback(
    (from: string, to: string, promotion: PromotionPiece = 'q'): boolean => {
      const currentPly = exploring ? explorePlyRef.current : 0
      const fen = exploring
        ? (exploreBaseFen ? buildPositions(exploreBaseFen, explorePathRef.current) : [])[currentPly]
        : positions[ply]
      if (!fen) return false
      const chess = new Chess(fen)
      let move
      try {
        move = chess.move({ from, to, promotion })
      } catch {
        return false
      }
      if (!move) return false
      if (exploring) {
        setExplorePath((prev) => [...prev.slice(0, currentPly), move.san])
      } else {
        setExploreBaseFen(positions[ply])
        setExplorePath([move.san])
        setExploring(true)
      }
      setExplorePly(currentPly + 1)
      return true
    },
    [exploring, exploreBaseFen, positions, ply],
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
        exploring,
        explorePath,
        explorePly,
        explorePositions,
        displayFen,
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
