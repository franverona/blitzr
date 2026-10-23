'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { markPuzzleRevealed, markPuzzleSolved } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { puzzleColorToMove, type MateProblem } from '@/lib/mateProblems'
import { BOARD_ANIMATION_DURATION_MS, resolveOrientation } from '@/lib/theme'
import { useSettings, useMoveSound } from './SettingsProvider'
import { LegalMoveSquare } from './LegalMoveSquare'
import { MoveSequence } from './MoveSequence'
import { PromotionPicker, type PromotionPiece } from './PromotionPicker'
import { ErrorText } from './ErrorText'
import { buttonClass, navButtonClass } from './styles'

type Feedback = 'incorrect' | null

// Fully manual: the solver plays every ply of the line, both sides. No hints.
// A defence puzzle is one ply: any of `problem.saves` solves it.
export function PuzzleBoard({
  problem,
  previousId,
  nextId,
}: {
  problem: MateProblem
  previousId: number | null
  nextId: number | null
}) {
  const s = getStrings()
  const boardColors = useSettings()
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [ply, setPly] = useState(0)
  // The ply on screen; ◀/▶ can move it back from the live tip (`ply`).
  const [viewPly, setViewPly] = useState(0)
  const [revealed, setRevealed] = useState(false)
  // The board already shows it solved, so a failed save would otherwise only surface on reload.
  const [saveFailed, setSaveFailed] = useState(false)
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null,
  )

  const [playedSave, setPlayedSave] = useState<string | null>(null)
  const { saves } = problem
  const line = useMemo(
    () => (saves ? [playedSave ?? saves[0]] : problem.moves),
    [saves, playedSave, problem.moves],
  )

  const solved = ply >= line.length
  const finished = solved || revealed
  const orientation = resolveOrientation(
    boardColors.trainingOrientation,
    puzzleColorToMove(problem),
  )
  const maxViewPly = revealed ? line.length : ply

  const positions = useMemo(() => {
    const chess = new Chess(problem.fen)
    const arr = [chess.fen()]
    for (const san of line.slice(0, maxViewPly)) {
      chess.move(san)
      arr.push(chess.fen())
    }
    return arr
  }, [problem.fen, line, maxViewPly])

  const fen = positions[viewPly]
  useMoveSound(fen)
  const turnColor = fen.split(' ')[1] === 'b' ? 'black' : 'white'
  const isLive = viewPly === ply

  function goToPly(p: number) {
    // The promotion overlay refers to the current position's squares.
    if (pendingPromotion) return
    setSelectedSquare(null)
    setViewPly(Math.max(0, Math.min(maxViewPly, p)))
  }

  // Arrow keys step through played moves, throttled like BoardNavControls.
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

  function attemptMove(from: string, to: string, promotion?: PromotionPiece): boolean {
    if (finished || !isLive) return false
    // Without an explicit piece, a promotion move opens the picker instead.
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
    if (saves ? saves.includes(move.san) : move.san === line[ply]) {
      setFeedback(null)
      if (saves) setPlayedSave(move.san)
      const nextPly = ply + 1
      setPly(nextPly)
      setViewPly(nextPly)
      if (nextPly >= line.length) {
        saveSolved()
      }
    } else {
      setFeedback('incorrect')
    }
    return true
  }

  function saveSolved() {
    setSaveFailed(false)
    markPuzzleSolved(problem.id).catch((err) => {
      console.error(err)
      setSaveFailed(true)
    })
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

  function choosePromotion(promotion: PromotionPiece) {
    if (!pendingPromotion) return
    attemptMove(pendingPromotion.from, pendingPromotion.to, promotion)
  }

  // Don't spoil moves not yet reached.
  const shownMoves = line.slice(0, maxViewPly)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      {/* lg+: 12rem ≈ chrome above/below the board. */}
      <div className="flex w-full max-w-140 shrink-0 flex-col gap-3 lg:max-w-[min(40rem,calc(100dvh-12rem))]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {!finished && isLive ? s.puzzles.toMove(turnColor) : ' '}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goToPly(viewPly - 1)}
              disabled={viewPly === 0 || !!pendingPromotion}
              aria-label={s.board.navLabels.previous}
              className={buttonClass({ size: 'xs' })}
            >
              ◀
            </button>
            <button
              onClick={() => goToPly(viewPly + 1)}
              disabled={viewPly === maxViewPly || !!pendingPromotion}
              aria-label={s.board.navLabels.next}
              className={buttonClass({ size: 'xs' })}
            >
              ▶
            </button>
          </div>
        </div>
        <BoardCoordinates
          show={boardColors.showCoordinates}
          orientation={orientation}
          className="w-full"
        >
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
                showNotation: false,
              }}
            />
            {pendingPromotion && <PromotionPicker color={turnColor} onChoose={choosePromotion} />}
          </div>
        </BoardCoordinates>
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

        {saves && !finished && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.puzzles.defendPrompt}</p>
        )}
        {feedback === 'incorrect' && !finished && isLive && (
          <ErrorText>{saves ? s.puzzles.allowsMate : s.puzzles.incorrect}</ErrorText>
        )}
        {finished && (
          <p
            className={
              solved
                ? 'text-sm font-medium text-emerald-600 dark:text-emerald-400'
                : 'text-sm font-medium text-zinc-600 dark:text-zinc-400'
            }
          >
            {solved ? s.puzzles.solved : s.puzzles.revealedTitle}
          </p>
        )}
        {saves && finished && (
          <div className="flex flex-col gap-2 text-sm">
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">{s.puzzles.savesLabel}: </span>
              {saves.join(', ')}
            </p>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">{s.puzzles.inTheGameLabel}:</p>
              <MoveSequence fen={problem.fen} moves={problem.moves} />
            </div>
          </div>
        )}
        {saveFailed && (
          <ErrorText>
            {s.puzzles.saveFailed}{' '}
            <button onClick={saveSolved} className="font-medium underline">
              {s.puzzles.retrySave}
            </button>
          </ErrorText>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setPendingPromotion(null)
              setRevealed(true)
              setViewPly(line.length)
              // Only queues it for a retry on Today, so a failed save just loses that.
              markPuzzleRevealed(problem.id).catch(console.error)
            }}
            disabled={finished}
            className={NAV_BUTTON_CLASS}
          >
            {s.puzzles.reveal}
          </button>
          <PuzzleLink id={previousId} label={s.puzzlesPage.previous} d="M15 6l-6 6 6 6" />
          <PuzzleLink id={nextId} label={s.puzzlesPage.next} d="M9 6l6 6-6 6" />
        </div>
      </div>
    </div>
  )
}

const NAV_BUTTON_CLASS = `px-3 text-sm whitespace-nowrap disabled:pointer-events-none ${navButtonClass(false)}`

function PuzzleLink({ id, label, d }: { id: number | null; label: string; d: string }) {
  const icon = (
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
  if (id === null) {
    return (
      <span
        role="link"
        aria-disabled
        aria-label={label}
        title={label}
        className={`${NAV_BUTTON_CLASS} pointer-events-none opacity-40`}
      >
        {icon}
      </span>
    )
  }
  return (
    <Link href={`/puzzles/${id}`} aria-label={label} title={label} className={NAV_BUTTON_CLASS}>
      {icon}
    </Link>
  )
}
