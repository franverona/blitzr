'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { REVEAL_ARROW_COLOR } from '@/lib/theme'
import { useBoardContext } from './Board'
import { useSettings, useMoveSound } from './SettingsProvider'
import { LegalMoveSquare } from './LegalMoveSquare'
import { ErrorText } from './ErrorText'
import { buttonClass } from './styles'

const OPPONENT_MOVE_DELAY_MS = 500

function revealArrow(fen: string, san: string) {
  try {
    const move = new Chess(fen).move(san)
    return [{ startSquare: move.from, endSquare: move.to, color: REVEAL_ARROW_COLOR }]
  } catch {
    return []
  }
}

/** Play a lesson's line from memory. Only your side (`myColor`) is
 *  quizzed; the opponent's replies auto-play. Progress is BoardProvider's
 *  `ply`, so MoveExplanation follows along without extra wiring. */
export function LessonQuiz({ sidebarExtra }: { sidebarExtra?: React.ReactNode }) {
  const { ply, setPly, positions, lastPly, myColor, boardOrientation, movesSan } = useBoardContext()
  const s = getStrings()
  const boardColors = useSettings()
  const [feedback, setFeedback] = useState<'incorrect' | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)

  const fen = positions[ply]
  useMoveSound(fen)
  const legalMoves = useMemo(
    () => (selectedSquare ? legalDestinations(fen, selectedSquare) : []),
    [selectedSquare, fen],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )
  const isMyTurn = ply < lastPly && (whiteToMove(ply + 1) ? 'white' : 'black') === myColor
  const isComplete = ply >= lastPly

  // Auto-play the opponent's move after a short delay.
  useEffect(() => {
    if (isMyTurn || isComplete) return
    const timer = setTimeout(() => setPly(ply + 1), OPPONENT_MOVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [ply, isComplete, isMyTurn, setPly])

  const handleHint = useCallback(() => {
    setRevealed(true)
    setHintsUsed((h) => h + 1)
  }, [])

  const handleRestart = useCallback(() => {
    setPly(0)
    setFeedback(null)
    setMistakes(0)
    setHintsUsed(0)
    setRevealed(false)
    setSelectedSquare(null)
  }, [setPly])

  // H → Show move, R → Restart. A focused button already handles keys natively.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') return
      const key = e.key.toLowerCase()
      if (key === 'h' && isMyTurn && !revealed && !isComplete) {
        handleHint()
      } else if (key === 'r') {
        handleRestart()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMyTurn, revealed, isComplete, handleHint, handleRestart])

  function attemptMove(from: string, to: string): boolean {
    if (!isMyTurn) return false
    const chess = new Chess(fen)
    let move
    try {
      // ponytail: always promote to queen, no promotion picker.
      move = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    if (!move) return false

    setSelectedSquare(null)
    if (move.san === movesSan[ply]) {
      setFeedback(null)
      setRevealed(false)
      setPly(ply + 1)
    } else {
      setFeedback('incorrect')
      setMistakes((m) => m + 1)
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
    if (!isMyTurn) return
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

  const arrows = revealed ? revealArrow(fen, movesSan[ply]) : []
  const colorLabel = s.common.color[myColor]

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      {/* lg+: 17rem ≈ chrome above/below the board. */}
      <div className="flex w-full max-w-140 shrink-0 flex-col gap-3 lg:max-w-[min(35rem,calc(100dvh-17rem))]">
        {/* Fixed height so swapping text variants doesn't shift the board. */}
        <div className="flex h-9 items-center justify-between gap-2">
          {isComplete ? (
            <p className="text-lg font-medium">{s.lessonQuiz.lineComplete}</p>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isMyTurn
                ? s.lessonQuiz.playingAs(colorLabel, ply + 1, lastPly)
                : s.lessonQuiz.opponentsMove}
            </p>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={handleRestart} className={buttonClass()}>
              {s.lessonQuiz.restart}
            </button>
            {!isComplete && (
              <button
                onClick={handleHint}
                disabled={revealed || !isMyTurn}
                className={buttonClass()}
              >
                {s.lessonQuiz.showMove}
              </button>
            )}
          </div>
        </div>

        <BoardCoordinates
          show={boardColors.showCoordinates}
          orientation={boardOrientation}
          className="w-full"
        >
          <div className="w-full overflow-hidden rounded shadow-lg">
            <Chessboard
              options={{
                position: fen,
                boardOrientation,
                allowDragging: isMyTurn,
                onPieceDrop: handleDrop,
                onSquareClick: handleSquareClick,
                squareRenderer: ({ square, children }) => (
                  <LegalMoveSquare
                    isSelected={square === selectedSquare}
                    isLegalMove={legalMoveMap.has(square)}
                    isCapture={legalMoveMap.get(square) ?? false}
                  >
                    {children}
                  </LegalMoveSquare>
                ),
                darkSquareStyle: { backgroundColor: boardColors.dark },
                lightSquareStyle: { backgroundColor: boardColors.light },
                showNotation: false,
                arrows,
              }}
            />
          </div>
        </BoardCoordinates>

        {isComplete ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {mistakes === 0 && hintsUsed === 0
              ? s.lessonQuiz.perfect
              : s.lessonQuiz.summary(mistakes, hintsUsed)}
          </p>
        ) : (
          feedback === 'incorrect' && <ErrorText>{s.lessonQuiz.notQuiteTryAgain}</ErrorText>
        )}

        <p className="text-xs text-zinc-600">{s.lessonQuiz.keyboardHint}</p>
      </div>

      {sidebarExtra && (
        <div className="flex w-full flex-col gap-4 lg:max-w-sm lg:flex-1 xl:max-w-md">
          {sidebarExtra}
        </div>
      )}
    </div>
  )
}
