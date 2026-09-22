'use client'

import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { markPuzzleSolved } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { puzzleColorToMove, type MateProblem } from '@/lib/mateProblems'
import { BOARD_ANIMATION_DURATION_MS, BOARD_NOTATION_SIZE_STYLE } from '@/lib/theme'
import { useBoardColors } from './BoardColorsProvider'
import { LegalMoveSquare } from './LegalMoveSquare'

type Feedback = 'incorrect' | null

// No hints, no engine — the point is to work it out yourself. Fully manual:
// unlike LessonQuiz's opponent-auto-plays-itself pattern, here *you* play
// every ply of the line, both sides, one at a time — "solved" means you
// walked the whole forced sequence yourself, not just found the first move.
// The board orientation stays fixed at whoever starts (never flips
// mid-solve), since you're moving both colors' pieces as you go.
export function PuzzleBoard({ problem }: { problem: MateProblem }) {
  const s = getStrings()
  const boardColors = useBoardColors()
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [ply, setPly] = useState(0)
  // Which already-played ply the board is showing — normally kept in sync
  // with `ply` (the live tip), but the ◀/▶ nav below can pull it back to
  // review an earlier move without disturbing solving progress. Nothing
  // beyond `ply` exists to browse into (those moves haven't been found yet).
  const [viewPly, setViewPly] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const solved = ply >= problem.moves.length
  const finished = solved || revealed
  const orientation = puzzleColorToMove(problem)

  // One FEN per ply solved so far, positions[0] being the puzzle's start —
  // recomputed from problem.fen + problem.moves rather than kept as state,
  // so it can never drift out of sync with `ply`.
  const positions = useMemo(() => {
    const chess = new Chess(problem.fen)
    const arr = [chess.fen()]
    for (const san of problem.moves.slice(0, ply)) {
      chess.move(san)
      arr.push(chess.fen())
    }
    return arr
  }, [problem.fen, problem.moves, ply])

  const fen = positions[viewPly]
  const turnColor = fen.split(' ')[1] === 'b' ? 'black' : 'white'
  // Only the live tip is interactive — an earlier ply is read-only review,
  // same idea as Board.tsx's own ply nav, just scoped to what's actually
  // been solved so far.
  const isLive = viewPly === ply

  function goToPly(p: number) {
    setSelectedSquare(null)
    setViewPly(Math.max(0, Math.min(ply, p)))
  }

  const legalMoves = useMemo(
    () => (isLive && selectedSquare ? legalDestinations(fen, selectedSquare) : []),
    [isLive, selectedSquare, fen],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  function attemptMove(from: string, to: string): boolean {
    if (finished || !isLive) return false
    const chess = new Chess(fen)
    let move
    try {
      move = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    if (!move) return false

    if (move.san === problem.moves[ply]) {
      setFeedback(null)
      const nextPly = ply + 1
      setPly(nextPly)
      setViewPly(nextPly)
      // Fire-and-forget, same convention as DrillSession's submitDrillAnswer
      // — the UI already reflects "solved" from local state, this just
      // persists it.
      if (nextPly >= problem.moves.length) {
        markPuzzleSolved(problem.id).catch(() => {})
      }
    } else {
      setFeedback('incorrect')
    }
    return true
  }

  function handleDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string
    targetSquare: string | null
  }): boolean {
    if (!targetSquare) return false
    return attemptMove(sourceSquare, targetSquare)
  }

  function handleSquareClick({ square, piece }: { square: string; piece: unknown | null }) {
    if (finished || !isLive) return
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null)
        return
      }
      const moved = attemptMove(selectedSquare, square)
      setSelectedSquare(!moved && piece ? square : null)
      return
    }
    if (piece) setSelectedSquare(square)
  }

  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {!finished && isLive ? s.puzzles.toMove(turnColor) : ' '}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goToPly(viewPly - 1)}
            disabled={viewPly === 0}
            aria-label={s.board.navLabels.previous}
            className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ◀
          </button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {s.puzzles.moveProgress(
              Math.min(viewPly + 1, problem.moves.length),
              problem.moves.length,
            )}
          </p>
          <button
            onClick={() => goToPly(viewPly + 1)}
            disabled={viewPly === ply}
            aria-label={s.board.navLabels.next}
            className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ▶
          </button>
        </div>
      </div>
      <div className="w-full overflow-hidden rounded shadow-lg">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            allowDragging: !finished && isLive,
            onPieceDrop: handleDrop,
            onSquareClick: handleSquareClick,
            animationDurationInMs: BOARD_ANIMATION_DURATION_MS,
            squareRenderer: ({ square, children }) => (
              <LegalMoveSquare
                isSelected={isLive && square === selectedSquare}
                isLegalMove={legalMoveMap.has(square)}
                isCapture={legalMoveMap.get(square) ?? false}
              >
                {children}
              </LegalMoveSquare>
            ),
            darkSquareStyle: { backgroundColor: boardColors.dark },
            lightSquareStyle: { backgroundColor: boardColors.light },
            darkSquareNotationStyle: boardColors.darkSquareNotationStyle,
            lightSquareNotationStyle: boardColors.lightSquareNotationStyle,
            alphaNotationStyle: BOARD_NOTATION_SIZE_STYLE,
            numericNotationStyle: BOARD_NOTATION_SIZE_STYLE,
          }}
        />
      </div>

      {feedback === 'incorrect' && !finished && isLive && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{s.puzzles.incorrect}</p>
      )}

      {finished ? (
        <div className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p
            className={
              solved
                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                : 'font-medium text-zinc-600 dark:text-zinc-400'
            }
          >
            {solved ? s.puzzles.solved : s.puzzles.revealedTitle}
          </p>
          <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300">{problem.solution}</p>
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-fit text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {s.puzzles.reveal}
        </button>
      )}
    </div>
  )
}
