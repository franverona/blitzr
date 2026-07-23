'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { whiteToMove } from '@/lib/drill'
import { legalDestinations } from '@/lib/legalMoves'
import { useBoardContext } from './Board'
import { LegalMoveSquare } from './LegalMoveSquare'

// Same amber used for every other reveal arrow in the app (the engine
// suggestion on Board.tsx, Drill's hint arrow).
const REVEAL_ARROW_COLOR = 'rgba(234, 179, 8, 0.9)'

// How long an auto-played opponent move sits highlighted before the next
// ply becomes yours — long enough to read, short enough not to feel like a
// stall.
const OPPONENT_MOVE_DELAY_MS = 500

function revealArrow(fen: string, san: string) {
  try {
    const move = new Chess(fen).move(san)
    return [{ startSquare: move.from, endSquare: move.to, color: REVEAL_ARROW_COLOR }]
  } catch {
    return []
  }
}

/** Active-recall practice for a lesson's line: play it from memory, one move
 *  at a time. Only quizzes *your* side — `boardOrientation` (flippable via
 *  FlipBoardButton in the lesson header) doubles as "which color am I
 *  practicing," same as it already means "which side is the board drawn
 *  from." The opponent's replies auto-play themselves after a short delay
 *  rather than being quizzed too: recalling the exact move an opponent would
 *  make isn't a real skill (in an actual game you just react to whatever
 *  they play), so testing it would just be memorizing trivia instead of
 *  practicing "what do I play here."
 *
 *  Reuses BoardProvider's own `ply`/`setPly` as the quiz's progress counter
 *  instead of separate state — which is also what lets MoveExplanation on
 *  the lesson page reveal each move's note the instant it's played (yours or
 *  the opponent's auto-played one), for free, with no wiring between the two
 *  components. Unlike DrillSession there's no per-card "Next" step: a wrong
 *  attempt just leaves you on the same ply to try again, since the "correct
 *  answer" here is always the one fixed line rather than one of several
 *  acceptable moves. */
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
  const isMyTurn = ply < lastPly && (whiteToMove(ply + 1) ? 'white' : 'black') === boardOrientation
  const isComplete = ply >= lastPly

  // Runs whenever it becomes the opponent's turn — advances the ply on their
  // behalf after a beat, so the line keeps moving without you having to find
  // (or even see quizzed) their move. Never fires two plies in a row since
  // chess strictly alternates colors, so this only ever advances one ply
  // before control returns to you.
  useEffect(() => {
    if (isMyTurn || isComplete) return
    const timer = setTimeout(() => setPly(ply + 1), OPPONENT_MOVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [ply, isComplete, isMyTurn, setPly])

  // useCallback (not plain functions) so both have a stable identity for the
  // keydown effect's dependency array below — otherwise the listener would
  // be torn down and re-added on every render.
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

  // H → Show move, R → Restart, mirroring DrillSession's keyboard shortcuts.
  // Ignores the event when a <button> already has focus, same guard as
  // DrillSession — pressing a shortcut key right after clicking a button
  // would otherwise fire twice for one keypress (once from the button, once
  // from this listener). Restart has no applicability guard (unlike hint) —
  // it's always a valid action, mid-line or not.
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
  const colorLabel = boardOrientation === 'white' ? 'White' : 'Black'

  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
      {/* Fixed height so the row doesn't reflow (and shift the board below
          it) when it swaps between the taller "Line complete!" text and the
          progress text + hint button — the two variants have different
          natural line-heights otherwise. */}
      <div className="flex h-9 items-center justify-between gap-2">
        {isComplete ? (
          <p className="text-lg font-medium">Line complete!</p>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isMyTurn
              ? `Playing as ${colorLabel} — move ${ply + 1} of ${lastPly}`
              : "Opponent's move…"}
          </p>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {/* Always available, not just after finishing — a way to bail out
              and start over mid-line without playing through the rest first. */}
          <button
            onClick={handleRestart}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800"
          >
            ⟲ Restart
          </button>
          {!isComplete && (
            <button
              onClick={handleHint}
              disabled={revealed || !isMyTurn}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 disabled:opacity-40"
            >
              💡 Show move
            </button>
          )}
        </div>
      </div>

      {/* Stays mounted through completion, showing the final position, rather
          than being replaced by a text-only summary screen — per direct user
          feedback that the board disappearing on finishing the line felt
          jarring. */}
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
            darkSquareStyle: { backgroundColor: '#769656' },
            lightSquareStyle: { backgroundColor: '#eeeed2' },
            darkSquareNotationStyle: { color: '#eeeed2' },
            lightSquareNotationStyle: { color: '#769656' },
            arrows,
          }}
        />
      </div>

      {isComplete ? (
        <p className="text-sm text-zinc-400">
          {mistakes === 0 && hintsUsed === 0
            ? 'Played it perfectly — no mistakes or hints.'
            : `${mistakes} mistake${mistakes === 1 ? '' : 's'}, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.`}
        </p>
      ) : (
        feedback === 'incorrect' && <p className="text-sm text-rose-400">Not quite — try again.</p>
      )}

      <p className="text-xs text-zinc-600">H → Show move · R → Restart</p>
    </div>
  )
}
