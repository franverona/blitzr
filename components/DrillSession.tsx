'use client'

import { useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { submitDrillAnswer } from '@/app/actions'
import type { DrillPrompt } from '@/lib/types'

type Feedback = 'correct' | 'incorrect' | null

// Same amber used for the engine-suggestion arrow on the game analysis
// board, so a "here's the move" arrow reads consistently everywhere it
// shows up.
const REVEAL_ARROW_COLOR = 'rgba(234, 179, 8, 0.9)'

function revealArrows(
  prompt: DrillPrompt,
): { startSquare: string; endSquare: string; color: string }[] {
  const chess = new Chess(prompt.fen)
  const arrows: { startSquare: string; endSquare: string; color: string }[] = []
  for (const san of prompt.correctMoves) {
    try {
      const move = chess.move(san)
      chess.undo()
      arrows.push({ startSquare: move.from, endSquare: move.to, color: REVEAL_ARROW_COLOR })
    } catch {
      // Shouldn't happen for a move that was accepted as correct, but skip
      // rather than crash if a card's data is ever out of sync.
    }
  }
  return arrows
}

export function DrillSession({
  prompts,
  totalCards,
}: {
  prompts: DrillPrompt[]
  totalCards: number
}) {
  // Captured once, from the initial load this session started with.
  // submitDrillAnswer revalidates /drill after every answer, which re-runs
  // the deck sync server-side and hands this component fresh props — a
  // just-answered card drops off, due counts change, and once the last due
  // card is answered `prompts` drops to []. Reading those props directly on
  // every render would let a background revalidation reshuffle the active
  // session's cards out from under `index`, or (worse) flip the component
  // straight to the "nothing due" empty state instead of the session-summary
  // screen the moment the last card is answered. A session works through the
  // fixed batch it started with, full stop.
  const [sessionPrompts] = useState(prompts)
  const [sessionTotalCards] = useState(totalCards)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [tally, setTally] = useState({ correct: 0, incorrect: 0 })

  // `feedback` state can't be trusted to guard against a double-fire within
  // the same tick (React state updates aren't visible to a second call in
  // the same synchronous handler pass) — a ref flips synchronously, so a
  // prompt can only ever be graded once no matter how many times the
  // underlying board library's click/drop handlers end up firing for one
  // logical move.
  const answeredRef = useRef(false)

  if (sessionPrompts.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {sessionTotalCards === 0
          ? 'Nothing to drill yet — build a repertoire and analyze some games to start building a deck.'
          : `No cards due right now (${sessionTotalCards} in your deck) — nice work. Check back later.`}
      </p>
    )
  }

  if (index >= sessionPrompts.length) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium">Session complete</p>
        <p className="text-sm text-zinc-400">
          {tally.correct} correct, {tally.incorrect} incorrect out of {sessionPrompts.length}.
        </p>
      </div>
    )
  }

  const prompt = sessionPrompts[index]

  function attemptMove(from: string, to: string): boolean {
    if (answeredRef.current) return false
    const chess = new Chess(prompt.fen)
    let move
    try {
      // ponytail: always promote to queen, same call as RepertoireBoard —
      // underpromotion doesn't come up in prepared-move/best-move drills.
      move = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    if (!move) return false

    answeredRef.current = true
    const correct = prompt.correctMoves.includes(move.san)
    setFeedback(correct ? 'correct' : 'incorrect')
    setTally((t) =>
      correct ? { ...t, correct: t.correct + 1 } : { ...t, incorrect: t.incorrect + 1 },
    )
    submitDrillAnswer(prompt.gameId, prompt.sourceType, prompt.ply, correct).catch(() => {})
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
    if (feedback) return
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

  function handleNext() {
    answeredRef.current = false
    setFeedback(null)
    setSelectedSquare(null)
    setIndex((i) => i + 1)
  }

  const arrows = feedback === 'incorrect' ? revealArrows(prompt) : []

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {prompt.gameLabel} ·{' '}
        {prompt.sourceType === 'deviation' ? 'Find your prepared move' : 'Find the best move'} ·
        card {index + 1} of {sessionPrompts.length}
      </p>

      <div className="w-full max-w-[480px] overflow-hidden rounded shadow-lg">
        <Chessboard
          options={{
            position: prompt.fen,
            boardOrientation: prompt.color,
            allowDragging: !feedback,
            onPieceDrop: handleDrop,
            onSquareClick: handleSquareClick,
            squareStyles: selectedSquare
              ? { [selectedSquare]: { boxShadow: 'inset 0 0 0 3px #eeeed2' } }
              : undefined,
            darkSquareStyle: { backgroundColor: '#769656' },
            lightSquareStyle: { backgroundColor: '#eeeed2' },
            darkSquareNotationStyle: { color: '#eeeed2' },
            lightSquareNotationStyle: { color: '#769656' },
            arrows,
          }}
        />
      </div>

      {feedback && (
        <div className="flex items-center gap-3">
          <p
            className={`text-sm ${feedback === 'correct' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-400'}`}
          >
            {feedback === 'correct'
              ? 'Correct!'
              : `Not quite — the move was ${prompt.correctMoves.join(' or ')}.`}
          </p>
          <button
            onClick={handleNext}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
