'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Move } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { submitDrillAnswer } from '@/app/actions'
import { isNearBestMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { hintPieceName } from '@/lib/san'
import { StockfishEngine } from '@/lib/stockfish/client'
import { terminalEval } from '@/lib/stockfish/analyze'
import { describeBlunderReason, detectBlunderReason } from '@/lib/tactics'
import { REVEAL_ARROW_COLOR } from '@/lib/theme'
import type { BlunderReason, DrillPrompt } from '@/lib/types'
import { useSettings, useMoveSound } from './SettingsProvider'
import { LegalMoveSquare } from './LegalMoveSquare'
import { PlayerAvatar } from './PlayerAvatar'

type Feedback = 'correct' | 'alternative' | 'incorrect' | null

const ALTERNATIVE_CHECK_MOVETIME_MS = 300

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
      // Skip rather than crash if a card's data is out of sync.
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
  dueCount,
  filtered,
}: {
  prompts: DrillPrompt[]
  totalCards: number
  /** Due cards matching the filter, before the session cap. */
  dueCount: number
  filtered: boolean
}) {
  // Snapshotted from the first render: submitDrillAnswer revalidates /drill,
  // and fresh props would reshuffle the active session (or jump to the empty
  // state after the last card). The setter is only for "Shuffle and restart".
  const s = getStrings()
  const boardColors = useSettings()
  const [sessionPrompts, setSessionPrompts] = useState(prompts)
  const [sessionTotalCards] = useState(totalCards)
  const [sessionDueCount] = useState(dueCount)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [tally, setTally] = useState({ correct: 0, incorrect: 0 })
  const [hangingReason, setHangingReason] = useState<BlunderReason | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  // Set only on a correct answer so the move visibly lands. On a wrong answer
  // the reveal arrow is drawn from `prompt.fen`, so the board stays there.
  const [committedFen, setCommittedFen] = useState<string | null>(null)

  const [checking, setChecking] = useState(false)

  // A ref, not state, so a move can't be graded twice within the same tick.
  const answeredRef = useRef(false)
  // Created on the first non-engine answer to a blunder card.
  const engineRef = useRef<StockfishEngine | null>(null)
  useEffect(() => () => engineRef.current?.terminate(), [])

  // Undefined on the session-complete screen; keeps the hooks unconditional.
  const prompt = sessionPrompts[index] as DrillPrompt | undefined
  const legalMoves = useMemo(
    () => (selectedSquare && prompt ? legalDestinations(prompt.fen, selectedSquare) : []),
    [selectedSquare, prompt],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )
  useMoveSound(committedFen ?? prompt?.fen ?? '')

  // Answers during a replay still re-grade the cards for real.
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

  const handleNext = useCallback(() => {
    answeredRef.current = false
    setFeedback(null)
    setHangingReason(null)
    setHintLevel(0)
    setCommittedFen(null)
    setSelectedSquare(null)
    setIndex((i) => i + 1)
  }, [])

  const handleHint = useCallback(() => {
    setHintLevel((level) => Math.min(3, level + 1))
  }, [])

  // A focused button already handles Enter/Space natively; avoid firing twice.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') return
      if ((e.key === ' ' || e.key === 'Enter') && feedback) {
        e.preventDefault()
        handleNext()
      } else if (e.key.toLowerCase() === 'h' && !feedback) {
        handleHint()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [feedback, handleNext, handleHint])

  if (sessionPrompts.length === 0) {
    return (
      <p className="mx-auto max-w-140 text-sm text-zinc-500 dark:text-zinc-400">
        {sessionTotalCards === 0
          ? s.drill.nothingToDrillYet
          : s.drill.noCardsDue(filtered, sessionTotalCards)}
      </p>
    )
  }

  if (!prompt) {
    const moreDue = sessionDueCount - sessionPrompts.length
    return (
      <div className="mx-auto flex w-full max-w-140 flex-col gap-3">
        <p className="text-lg font-medium">{s.drill.sessionComplete}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {s.drill.tally(tally.correct, tally.incorrect, sessionPrompts.length)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRestart}
            className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {s.drill.shuffleAndRestart}
          </button>
          {moreDue > 0 && (
            // Plain <a>: a full reload is needed so the snapshotted session resets.
            <a href="/drill" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              {s.drill.moreDue(moreDue)}
            </a>
          )}
        </div>
      </div>
    )
  }

  // Narrowed copy for the closures below.
  const activePrompt = prompt

  function attemptMove(from: string, to: string): boolean {
    if (answeredRef.current) return false
    const chess = new Chess(activePrompt.fen)
    let move
    try {
      // ponytail: always promote to queen; underpromotion doesn't come up here.
      move = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    if (!move) return false

    answeredRef.current = true
    if (activePrompt.correctMoves.includes(move.san)) {
      grade(move, 'correct')
    } else if (activePrompt.evalBefore) {
      checkAlternative(move, activePrompt.evalBefore)
    } else {
      grade(move, 'incorrect')
    }
    return true
  }

  async function checkAlternative(move: Move, evalBefore: NonNullable<DrillPrompt['evalBefore']>) {
    setChecking(true)
    setCommittedFen(move.after)
    let accepted = false
    try {
      engineRef.current ??= new StockfishEngine()
      const evalAfter =
        terminalEval(move.after) ??
        (await engineRef.current.evaluate(move.after, ALTERNATIVE_CHECK_MOVETIME_MS))
      accepted = isNearBestMove(move.before, evalBefore, evalAfter)
    } catch {
      // Engine unavailable: fall back to engine-move-only grading.
    }
    setChecking(false)
    grade(move, accepted ? 'alternative' : 'incorrect')
  }

  function grade(move: Move, result: Exclude<Feedback, null>) {
    const correct = result !== 'incorrect'
    setFeedback(result)
    setCommittedFen(correct ? move.after : null)
    setHangingReason(
      detectBlunderReason(move.before, move.after, move.color === 'w' ? 'white' : 'black'),
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
    if (feedback || checking) return
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

  const revealed = feedback === 'incorrect' || hintLevel >= 2 ? revealArrows(prompt) : []
  const arrows = feedback === 'incorrect' || hintLevel >= 3 ? revealed : []
  const hintOriginSquares = new Set(hintLevel >= 2 ? revealed.map((a) => a.startSquare) : [])

  return (
    // lg+: 18rem ≈ chrome above/below the board.
    <div className="mx-auto flex w-full max-w-140 flex-col gap-3 lg:max-w-[min(35rem,calc(100dvh-18rem))]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlayerAvatar username={prompt.opponentUsername} avatarUrl={prompt.opponentAvatarUrl} />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {prompt.gameLabel} ·{' '}
            {prompt.sourceType === 'deviation' ? s.drill.findPreparedMove : s.drill.findBestMove} ·{' '}
            {s.drill.cardOf(index + 1, sessionPrompts.length)}
          </p>
        </div>
        {/* `invisible`, not unmounted, so the row height doesn't shift. */}
        <button
          onClick={handleHint}
          disabled={hintLevel >= 3 || !!feedback || checking}
          className={`shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800 ${feedback ? 'invisible' : ''}`}
        >
          {s.drill.hint}
        </button>
      </div>

      <BoardCoordinates
        show={boardColors.showCoordinates}
        orientation={prompt.color}
        className="w-full"
      >
        <div className="w-full overflow-hidden rounded shadow-lg">
          <Chessboard
            options={{
              position: committedFen ?? prompt.fen,
              boardOrientation: prompt.color,
              allowDragging: !feedback && !checking,
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
              darkSquareStyle: { backgroundColor: boardColors.dark },
              lightSquareStyle: { backgroundColor: boardColors.light },
              showNotation: false,
              arrows,
            }}
          />
        </div>
      </BoardCoordinates>

      {hintLevel >= 1 && (
        <p className="text-sm text-zinc-400">
          {s.drill.hintText(
            [...new Set(activePrompt.correctMoves.map((san) => hintPieceName(san)))].join(
              ` ${s.drill.or} `,
            ),
          )}
        </p>
      )}

      {checking && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.drill.checkingMove}</p>
      )}

      {feedback && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <p
              className={`text-sm ${feedback === 'incorrect' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
            >
              {feedback === 'correct'
                ? s.drill.correct
                : feedback === 'alternative'
                  ? s.drill.alsoGood(prompt.correctMoves.join(` ${s.drill.or} `))
                  : s.drill.notQuite(prompt.correctMoves.join(` ${s.drill.or} `))}
            </p>
            <button
              onClick={handleNext}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {s.drill.next}
            </button>
          </div>
          {hangingReason && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {describeBlunderReason(hangingReason)}
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-600">{s.drill.keyboardHint}</p>
    </div>
  )
}
