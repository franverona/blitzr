'use client'

import { useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { submitDrillAnswer } from '@/app/actions'
import { describeHangingPieceReason, detectHangingPiece } from '@/lib/hangingPiece'
import { legalDestinations } from '@/lib/legalMoves'
import { hintPieceName } from '@/lib/san'
import type { DrillPrompt, HangingPieceReason } from '@/lib/types'
import { LegalMoveSquare } from './LegalMoveSquare'
import { PlayerAvatar } from './PlayerAvatar'

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

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
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
  // Gains a setter only for "Shuffle and restart" (below) to reorder — never
  // to accept fresh server data, which would reintroduce the exact
  // revalidation-reshuffle problem this snapshot exists to prevent.
  const [sessionPrompts, setSessionPrompts] = useState(prompts)
  const [sessionTotalCards] = useState(totalCards)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [tally, setTally] = useState({ correct: 0, incorrect: 0 })
  const [hangingReason, setHangingReason] = useState<HangingPieceReason | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  // The board otherwise always shows `prompt.fen` (the position *before* the
  // move) — set only on a correct answer, so the board actually shows your
  // move landing rather than snapping back to the pre-move position. Left
  // null on an incorrect answer: the reveal arrow is computed from
  // `prompt.fen`, so showing the (wrong) move played would put the board and
  // the arrow out of sync.
  const [committedFen, setCommittedFen] = useState<string | null>(null)

  // `feedback` state can't be trusted to guard against a double-fire within
  // the same tick (React state updates aren't visible to a second call in
  // the same synchronous handler pass) — a ref flips synchronously, so a
  // prompt can only ever be graded once no matter how many times the
  // underlying board library's click/drop handlers end up firing for one
  // logical move.
  const answeredRef = useRef(false)

  // Indexed even when `index` is out of range (session-complete screen) —
  // array indexing out of bounds is `undefined`, not a throw, so these hooks
  // can stay unconditional above the early returns below.
  const prompt = sessionPrompts[index] as DrillPrompt | undefined
  const legalMoves = useMemo(
    () => (selectedSquare && prompt ? legalDestinations(prompt.fen, selectedSquare) : []),
    [selectedSquare, prompt],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  // No server round-trip — reshuffles the cards already loaded for this
  // session and starts back at card 1. Answering during the replay still
  // calls submitDrillAnswer normally (below), which re-grades each card for
  // real (submitDrillAnswer never checks whether a card is "due"), so this
  // is a legitimate retry today rather than ungraded practice.
  function handleRestart() {
    setSessionPrompts((prev) => shuffle(prev))
    setIndex(0)
    setTally({ correct: 0, incorrect: 0 })
    setFeedback(null)
    setHangingReason(null)
    setHintLevel(0)
    setCommittedFen(null)
    setSelectedSquare(null)
    answeredRef.current = false
  }

  if (sessionPrompts.length === 0) {
    return (
      <p className="mx-auto max-w-140 text-sm text-zinc-500 dark:text-zinc-400">
        {sessionTotalCards === 0
          ? 'Nothing to drill yet — build a repertoire and analyze some games to start building a deck.'
          : `No cards due right now (${sessionTotalCards} in your deck) — nice work. Check back later.`}
      </p>
    )
  }

  if (!prompt) {
    return (
      <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
        <p className="text-lg font-medium">Session complete</p>
        <p className="text-sm text-zinc-400">
          {tally.correct} correct, {tally.incorrect} incorrect out of {sessionPrompts.length}.
        </p>
        <button
          onClick={handleRestart}
          className="w-fit rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800"
        >
          Shuffle and restart
        </button>
      </div>
    )
  }

  // Reassigned to a variable TS narrows to non-optional at the closures
  // below — `prompt` itself stays a union type inside nested function
  // declarations since TS doesn't carry the `if (!prompt)` narrowing across
  // them.
  const activePrompt = prompt

  function attemptMove(from: string, to: string): boolean {
    if (answeredRef.current) return false
    const chess = new Chess(activePrompt.fen)
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
    const correct = activePrompt.correctMoves.includes(move.san)
    setFeedback(correct ? 'correct' : 'incorrect')
    if (correct) setCommittedFen(move.after)
    setHangingReason(
      detectHangingPiece(move.before, move.after, move.color === 'w' ? 'white' : 'black'),
    )
    setTally((t) =>
      correct ? { ...t, correct: t.correct + 1 } : { ...t, incorrect: t.incorrect + 1 },
    )
    submitDrillAnswer(
      activePrompt.gameId,
      activePrompt.sourceType,
      activePrompt.ply,
      correct,
    ).catch(() => {})
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
    setHangingReason(null)
    setHintLevel(0)
    setCommittedFen(null)
    setSelectedSquare(null)
    setIndex((i) => i + 1)
  }

  function handleHint() {
    setHintLevel((level) => Math.min(3, level + 1))
  }

  // Level 2 (origin square) and level 3 (full arrow) both need the same
  // replayed moves, so compute once and slice what each level shows from it.
  const revealed = feedback === 'incorrect' || hintLevel >= 2 ? revealArrows(prompt) : []
  const arrows = feedback === 'incorrect' || hintLevel >= 3 ? revealed : []
  const hintOriginSquares = new Set(hintLevel >= 2 ? revealed.map((a) => a.startSquare) : [])

  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlayerAvatar username={prompt.opponentUsername} avatarUrl={prompt.opponentAvatarUrl} />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {prompt.gameLabel} ·{' '}
            {prompt.sourceType === 'deviation' ? 'Find your prepared move' : 'Find the best move'} ·
            card {index + 1} of {sessionPrompts.length}
          </p>
        </div>
        {/* `invisible` rather than unmounting on `feedback` — keeps the
            button's box in the layout so this row's height doesn't change
            between states, which was shifting the board a couple pixels
            every time a card got answered. */}
        <button
          onClick={handleHint}
          disabled={hintLevel >= 3 || !!feedback}
          className={`shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 ${feedback ? 'invisible' : ''}`}
        >
          💡 Hint
        </button>
      </div>

      <div className="w-full overflow-hidden rounded shadow-lg">
        <Chessboard
          options={{
            position: committedFen ?? prompt.fen,
            boardOrientation: prompt.color,
            allowDragging: !feedback,
            onPieceDrop: handleDrop,
            onSquareClick: handleSquareClick,
            squareRenderer: ({ square, children }) => (
              <LegalMoveSquare
                isSelected={square === selectedSquare}
                isLegalMove={legalMoveMap.has(square)}
                isCapture={legalMoveMap.get(square) ?? false}
                isHintOrigin={hintOriginSquares.has(square)}
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

      {hintLevel >= 1 && (
        <p className="text-sm text-zinc-400">
          Hint: it&rsquo;s a{' '}
          {[...new Set(activePrompt.correctMoves.map(hintPieceName))].join(' or ')} move.
        </p>
      )}

      {feedback && (
        <div className="flex flex-col gap-2">
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
          {hangingReason && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {describeHangingPieceReason(hangingReason)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
