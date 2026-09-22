'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { markPuzzleSolved } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { puzzleColorToMove, type MateProblem } from '@/lib/mateProblems'
import type { SanPiece } from '@/lib/san'
import { BOARD_ANIMATION_DURATION_MS, BOARD_NOTATION_SIZE_STYLE } from '@/lib/theme'
import { useBoardColors } from './BoardColorsProvider'
import { LegalMoveSquare } from './LegalMoveSquare'
import { MoveSequence } from './MoveSequence'
import { PieceGlyph } from './PieceGlyph'

type Feedback = 'incorrect' | null

// chess.js's own lowercase promotion letters, in the order offered to the
// solver — not every mate needs a queen; several imported puzzles are only
// mate because of an under-promotion (e.g. cxb8=N#), so unlike the other
// boards in this app (RepertoireBoard, Board's explore mode), this can't
// just hardcode 'q'.
const PROMOTION_PIECES: { promotion: 'q' | 'r' | 'b' | 'n'; glyph: SanPiece }[] = [
  { promotion: 'q', glyph: 'Q' },
  { promotion: 'r', glyph: 'R' },
  { promotion: 'b', glyph: 'B' },
  { promotion: 'n', glyph: 'N' },
]

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
  // Set instead of immediately resolving a move that lands a pawn on the
  // back rank — attemptMove pauses there until choosePromotion picks a
  // piece, rather than assuming queen like the app's other boards do.
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null,
  )

  const solved = ply >= problem.moves.length
  const finished = solved || revealed
  const orientation = puzzleColorToMove(problem)
  // Revealing shows the whole forced line, not just what's been solved so
  // far — the board should be browsable through all of it, not stuck at
  // wherever the solver gave up.
  const maxViewPly = revealed ? problem.moves.length : ply

  // One FEN per ply solved so far (or, once revealed, per ply of the whole
  // solution), positions[0] being the puzzle's start — recomputed from
  // problem.fen + problem.moves rather than kept as state, so it can never
  // drift out of sync with `ply`.
  const positions = useMemo(() => {
    const chess = new Chess(problem.fen)
    const arr = [chess.fen()]
    for (const san of problem.moves.slice(0, maxViewPly)) {
      chess.move(san)
      arr.push(chess.fen())
    }
    return arr
  }, [problem.fen, problem.moves, maxViewPly])

  const fen = positions[viewPly]
  const turnColor = fen.split(' ')[1] === 'b' ? 'black' : 'white'
  // Only the live tip is interactive — an earlier ply is read-only review,
  // same idea as Board.tsx's own ply nav, just scoped to what's actually
  // been solved so far.
  const isLive = viewPly === ply

  function goToPly(p: number) {
    // Navigating away mid-promotion-pick would leave the piece-picker
    // overlay open over a position `pendingPromotion`'s from/to squares no
    // longer refer to.
    if (pendingPromotion) return
    setSelectedSquare(null)
    setViewPly(Math.max(0, Math.min(maxViewPly, p)))
  }

  // Left/right arrow keys step through the move list the same as the ◀/▶
  // buttons — same global (not focus-scoped) convention BoardNavControls
  // uses on the game/lesson pages, minus Space/0 (no autoplay or "jump to
  // start" concept here). Throttled to BOARD_ANIMATION_DURATION_MS for the
  // same reason: rapid key taps would otherwise cut the board's own slide
  // animation off mid-flight. Steps `viewPly`/`maxViewPly` inline (not via
  // `goToPly`) so the effect only needs stable state setters as deps, not a
  // plain function that's a new reference on every render.
  const lastNavAtRef = useRef(0)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      if (pendingPromotion) return
      const now = Date.now()
      if (now - lastNavAtRef.current < BOARD_ANIMATION_DURATION_MS) return
      lastNavAtRef.current = now
      setSelectedSquare(null)
      const delta = e.key === 'ArrowLeft' ? -1 : 1
      setViewPly((vp) => Math.max(0, Math.min(maxViewPly, vp + delta)))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [maxViewPly, pendingPromotion])

  const legalMoves = useMemo(
    () => (isLive && selectedSquare ? legalDestinations(fen, selectedSquare) : []),
    [isLive, selectedSquare, fen],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  function attemptMove(from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): boolean {
    if (finished || !isLive) return false
    // A fresh attempt (no explicit promotion yet) is blocked while the
    // picker is already open — but the resolving call from choosePromotion
    // itself, which always passes one, needs to get through.
    if (!promotion) {
      if (pendingPromotion) return false
      if (legalDestinations(fen, from).some((m) => m.to === to && m.isPromotion)) {
        setSelectedSquare(null)
        setPendingPromotion({ from, to })
        return true
      }
    }

    const chess = new Chess(fen)
    let move
    try {
      move = chess.move({ from, to, promotion: promotion ?? 'q' })
    } catch {
      return false
    }
    if (!move) return false

    setPendingPromotion(null)
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
    if (finished || !isLive || pendingPromotion) return
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

  function choosePromotion(promotion: 'q' | 'r' | 'b' | 'n') {
    if (!pendingPromotion) return
    attemptMove(pendingPromotion.from, pendingPromotion.to, promotion)
  }

  // Only the moves actually reached so far — the full solution only once
  // finished (matching `positions`/`maxViewPly` above), so the list doesn't
  // spoil the rest of the line while still solving.
  const shownMoves = problem.moves.slice(0, maxViewPly)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex w-full max-w-140 shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {!finished && isLive ? s.puzzles.toMove(turnColor) : ' '}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goToPly(viewPly - 1)}
              disabled={viewPly === 0 || !!pendingPromotion}
              aria-label={s.board.navLabels.previous}
              className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ◀
            </button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {s.puzzles.moveProgress(viewPly, problem.moves.length)}
            </p>
            <button
              onClick={() => goToPly(viewPly + 1)}
              disabled={viewPly === maxViewPly || !!pendingPromotion}
              aria-label={s.board.navLabels.next}
              className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ▶
            </button>
          </div>
        </div>
        <div className="relative w-full overflow-hidden rounded shadow-lg">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              allowDragging: !finished && isLive && !pendingPromotion,
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
          {pendingPromotion && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center gap-2 rounded-lg bg-zinc-50 p-4 shadow-xl dark:bg-zinc-900">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {s.puzzles.choosePromotion}
                </p>
                <div className="flex gap-2">
                  {PROMOTION_PIECES.map(({ promotion, glyph }) => (
                    <button
                      key={promotion}
                      onClick={() => choosePromotion(promotion)}
                      className="h-12 w-12 rounded border border-zinc-300 bg-white p-1 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    >
                      <PieceGlyph piece={glyph} color={turnColor} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {feedback === 'incorrect' && !finished && isLive && (
          <p className="text-sm text-rose-600 dark:text-rose-400">{s.puzzles.incorrect}</p>
        )}

        {finished ? (
          <p
            className={
              solved
                ? 'text-sm font-medium text-emerald-600 dark:text-emerald-400'
                : 'text-sm font-medium text-zinc-600 dark:text-zinc-400'
            }
          >
            {solved ? s.puzzles.solved : s.puzzles.revealedTitle}
          </p>
        ) : (
          <button
            onClick={() => {
              setPendingPromotion(null)
              setRevealed(true)
              setViewPly(problem.moves.length)
            }}
            className="w-fit text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            {s.puzzles.reveal}
          </button>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 lg:max-w-sm lg:flex-1 xl:max-w-md">
        <div className="flex w-full flex-col overflow-hidden rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="border-b border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {s.puzzles.movesLabel}
          </p>
          <div className="px-3 py-2 text-base">
            {shownMoves.length > 0 ? (
              <MoveSequence
                fen={problem.fen}
                moves={shownMoves}
                currentIndex={viewPly > 0 ? viewPly - 1 : undefined}
                onSelectIndex={(i) => goToPly(i + 1)}
              />
            ) : (
              <span className="text-sm text-zinc-400 dark:text-zinc-500">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
