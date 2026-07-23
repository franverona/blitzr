'use client'

import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { legalDestinations } from '@/lib/legalMoves'
import { useBoardContext } from './Board'
import { LegalMoveSquare } from './LegalMoveSquare'

// Same amber used for every other reveal arrow in the app (the engine
// suggestion on Board.tsx, Drill's hint arrow).
const REVEAL_ARROW_COLOR = 'rgba(234, 179, 8, 0.9)'

function revealArrow(fen: string, san: string) {
  try {
    const move = new Chess(fen).move(san)
    return [{ startSquare: move.from, endSquare: move.to, color: REVEAL_ARROW_COLOR }]
  } catch {
    return []
  }
}

/** Active-recall practice for a lesson's line: play it from memory, one move
 *  at a time (either color, same as the study board). Reuses BoardProvider's
 *  own `ply`/`setPly` as the quiz's progress counter instead of separate
 *  state — which is also what lets MoveExplanation on the lesson page reveal
 *  each move's note the instant it's answered correctly, for free, with no
 *  wiring between the two components. Unlike DrillSession there's no
 *  per-card "Next" step: a wrong attempt just leaves you on the same ply to
 *  try again, since the "correct answer" here is always the one fixed line
 *  rather than one of several acceptable moves. */
export function LessonQuiz() {
  const { ply, setPly, positions, lastPly, boardOrientation, movesSan } = useBoardContext()
  const [feedback, setFeedback] = useState<'incorrect' | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)

  const fen = positions[ply]
  const legalMoves = useMemo(
    () => (selectedSquare ? legalDestinations(fen, selectedSquare) : []),
    [selectedSquare, fen],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  function handleRestart() {
    setPly(0)
    setFeedback(null)
    setMistakes(0)
    setHintsUsed(0)
    setRevealed(false)
    setSelectedSquare(null)
  }

  if (ply >= lastPly) {
    return (
      <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
        <p className="text-lg font-medium">Line complete!</p>
        <p className="text-sm text-zinc-400">
          {mistakes === 0 && hintsUsed === 0
            ? 'Played it perfectly — no mistakes or hints.'
            : `${mistakes} mistake${mistakes === 1 ? '' : 's'}, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.`}
        </p>
        <button
          onClick={handleRestart}
          className="w-fit rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800"
        >
          Restart
        </button>
      </div>
    )
  }

  function attemptMove(from: string, to: string): boolean {
    const chess = new Chess(fen)
    let move
    try {
      // ponytail: always promote to queen, same convention as
      // RepertoireBoard/DrillSession — no promotion picker.
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

  function handleHint() {
    setRevealed(true)
    setHintsUsed((h) => h + 1)
  }

  const arrows = revealed ? revealArrow(fen, movesSan[ply]) : []

  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Move {ply + 1} of {lastPly} — play the next move in the line
        </p>
        <button
          onClick={handleHint}
          disabled={revealed}
          className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 disabled:opacity-40"
        >
          💡 Show move
        </button>
      </div>

      <div className="w-full overflow-hidden rounded shadow-lg">
        <Chessboard
          options={{
            position: fen,
            boardOrientation,
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
            darkSquareStyle: { backgroundColor: '#769656' },
            lightSquareStyle: { backgroundColor: '#eeeed2' },
            darkSquareNotationStyle: { color: '#eeeed2' },
            lightSquareNotationStyle: { color: '#769656' },
            arrows,
          }}
        />
      </div>

      {feedback === 'incorrect' && <p className="text-sm text-rose-400">Not quite — try again.</p>}
    </div>
  )
}
