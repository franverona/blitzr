'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Chess, type Move } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { submitDrillAnswer, undoDrillAnswer } from '@/app/actions'
import { isNearBestMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { hintPieceName } from '@/lib/san'
import { StockfishEngine } from '@/lib/stockfish/client'
import { terminalEval } from '@/lib/stockfish/analyze'
import { describeBlunderReason, detectBlunderReason } from '@/lib/tactics'
import { REVEAL_ARROW_COLOR } from '@/lib/theme'
import type { BlunderReason, DrillPrompt, DrillSourceType, DrillUndo } from '@/lib/types'
import { useSettings, useMoveSound } from './SettingsProvider'
import { LegalMoveSquare } from './LegalMoveSquare'
import { ErrorText } from './ErrorText'
import { PlayerAvatar } from './PlayerAvatar'
import { PromotionPicker, type PromotionPiece } from './PromotionPicker'
import { buttonClass, LINK_CLASS } from './styles'

// 'helped': right move, but after the hint showed its square, so it's scheduled as a miss.
type Feedback = 'correct' | 'alternative' | 'helped' | 'incorrect' | null

interface DrillAnswer {
  gameId: string
  sourceType: DrillSourceType
  ply: number
  correct: boolean
}

const ALTERNATIVE_CHECK_MOVETIME_MS = 300
// Long enough to see the move land and read the feedback.
const AUTO_ADVANCE_DELAY_MS = 1200
// Per tab, so a reload resumes the session instead of drawing a new one.
const SESSION_STORAGE_KEY = 'blitzr-drill-session'

interface StoredSession {
  deckKey: string
  prompts: DrillPrompt[]
  /** The next unanswered card. */
  index: number
  tally: { correct: number; incorrect: number }
  dueCount: number
}

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

function readStoredSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Resumes this tab's session if it's for the same filters and unfinished, so
 *  a reload after it draws the next due cards. */
function parseStoredSession(raw: string | null, deckKey: string): StoredSession | null {
  try {
    const saved = JSON.parse(raw ?? 'null') as StoredSession | null
    return saved?.deckKey === deckKey && saved.index < saved.prompts.length ? saved : null
  } catch {
    return null
  }
}

const noSubscribe = () => () => {}

export function DrillSession(props: Omit<Parameters<typeof DrillDeck>[0], 'resumed'>) {
  // undefined during SSR and hydration (no sessionStorage); rendering nothing
  // until it's read keeps the server's fresh deck from flashing first.
  const raw = useSyncExternalStore(noSubscribe, readStoredSession, () => undefined)
  if (raw === undefined) return null
  return <DrillDeck {...props} resumed={parseStoredSession(raw, props.deckKey)} />
}

function DrillDeck({
  resumed,
  deckKey,
  prompts,
  totalCards,
  dueCount,
  filtered,
  initialAutoAdvance,
}: {
  resumed: StoredSession | null
  /** The active filters; a stored session only resumes under the same ones. */
  deckKey: string
  prompts: DrillPrompt[]
  totalCards: number
  /** Due cards matching the filter, before the session cap. */
  dueCount: number
  filtered: boolean
  initialAutoAdvance: boolean
}) {
  // Snapshotted from the first render: submitDrillAnswer revalidates /drill,
  // and fresh props would reshuffle the active session (or jump to the empty
  // state after the last card). The setter is only for "Shuffle and restart".
  const s = getStrings()
  const boardColors = useSettings()
  const [sessionPrompts, setSessionPrompts] = useState(resumed?.prompts ?? prompts)
  const [sessionTotalCards] = useState(totalCards)
  const [sessionDueCount] = useState(resumed?.dueCount ?? dueCount)
  const [index, setIndex] = useState(resumed?.index ?? 0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [tally, setTally] = useState(resumed?.tally ?? { correct: 0, incorrect: 0 })
  const [hangingReason, setHangingReason] = useState<BlunderReason | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  // The played move stays on the board, right or wrong; a wrong one gets the
  // reveal arrow on top to compare against.
  const [committedFen, setCommittedFen] = useState<string | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null,
  )

  const [checking, setChecking] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(initialAutoAdvance)
  // Answers whose save failed. Kept across cards so auto-advance can't hide the error.
  const [unsaved, setUnsaved] = useState<DrillAnswer[]>([])
  // The current card's answer, until Next: its save resolves to what undoing it needs.
  const lastAnswerRef = useRef<{ answer: DrillAnswer; saved: Promise<DrillUndo | null> } | null>(
    null,
  )
  const [undoing, setUndoing] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)

  // A ref, not state, so a move can't be graded twice within the same tick.
  const answeredRef = useRef(false)
  // Created on the first non-engine answer to a blunder card.
  const engineRef = useRef<StockfishEngine | null>(null)
  useEffect(() => () => engineRef.current?.terminate(), [])

  // An answered card counts as done, so a reload before "Next" skips it.
  useEffect(() => {
    const saved: StoredSession = {
      deckKey,
      prompts: sessionPrompts,
      index: feedback ? index + 1 : index,
      tally,
      dueCount: sessionDueCount,
    }
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // Storage full or blocked: the session just won't survive a reload.
    }
  }, [deckKey, sessionPrompts, index, feedback, tally, sessionDueCount])

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
    setPendingPromotion(null)
    answeredRef.current = false
  }

  const handleNext = useCallback(() => {
    answeredRef.current = false
    lastAnswerRef.current = null
    setUndoError(null)
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

  // Unchecking during the pause cancels it.
  useEffect(() => {
    if (!autoAdvance || !feedback || feedback === 'incorrect' || undoing) return
    const timer = setTimeout(handleNext, AUTO_ADVANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [autoAdvance, feedback, handleNext, undoing])

  // A focused button already handles Enter/Space natively; avoid firing twice.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') return
      if ((e.key === ' ' || e.key === 'Enter') && feedback) {
        e.preventDefault()
        handleNext()
      } else if (e.key.toLowerCase() === 'h' && !feedback) {
        handleHint()
      } else if (e.key.toLowerCase() === 'u' && feedback) {
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

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
          <button onClick={handleRestart} className={`w-fit ${buttonClass()}`}>
            {s.drill.shuffleAndRestart}
          </button>
          {moreDue > 0 && (
            // Plain <a>: a full reload is needed so the snapshotted session resets.
            <a href="/drill" className={`text-sm ${LINK_CLASS}`}>
              {s.drill.moreDue(moreDue)}
            </a>
          )}
        </div>
      </div>
    )
  }

  // Narrowed copy for the closures below.
  const activePrompt = prompt

  function attemptMove(from: string, to: string, promotion?: PromotionPiece): boolean {
    if (answeredRef.current) return false
    // An engine "best move" can be an underpromotion, so ask instead of assuming a queen.
    if (!promotion) {
      if (pendingPromotion) return false
      if (legalDestinations(activePrompt.fen, from).some((m) => m.to === to && m.isPromotion)) {
        setPendingPromotion({ from, to })
        return true
      }
    }
    const chess = new Chess(activePrompt.fen)
    let move
    try {
      move = chess.move({ from, to, promotion: promotion ?? 'q' })
    } catch {
      return false
    }
    if (!move) return false
    setPendingPromotion(null)

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

  function grade(move: Move, graded: 'correct' | 'alternative' | 'incorrect') {
    const result = graded !== 'incorrect' && hintLevel >= 2 ? 'helped' : graded
    const correct = result === 'correct' || result === 'alternative'
    setFeedback(result)
    setCommittedFen(move.after)
    setHangingReason(
      detectBlunderReason(move.before, move.after, move.color === 'w' ? 'white' : 'black'),
    )
    setTally((t) =>
      correct ? { ...t, correct: t.correct + 1 } : { ...t, incorrect: t.incorrect + 1 },
    )
    const answer = {
      gameId: activePrompt.gameId,
      sourceType: activePrompt.sourceType,
      ply: activePrompt.ply,
      correct,
    }
    lastAnswerRef.current = { answer, saved: saveAnswer(answer) }
  }

  /** Resolves to null when the save failed (the answer is then in `unsaved`). */
  function saveAnswer(answer: DrillAnswer): Promise<DrillUndo | null> {
    return submitDrillAnswer(answer.gameId, answer.sourceType, answer.ply, answer.correct).catch(
      (err) => {
        console.error(err)
        setUnsaved((u) => [...u, answer])
        return null
      },
    )
  }

  // Back to the unanswered card, with the SM-2 schedule as it was.
  async function handleUndo() {
    const last = lastAnswerRef.current
    if (!last || undoing) return
    setUndoing(true)
    setUndoError(null)
    const undo = await last.saved
    const { answer } = last
    if (undo) {
      const result = await undoDrillAnswer(answer.gameId, answer.sourceType, answer.ply, undo)
      if (!result.ok) {
        setUndoError(result.error)
        setUndoing(false)
        return
      }
    } else {
      // Never saved, so there's nothing to revert on the server.
      setUnsaved((u) => u.filter((a) => a !== answer))
    }
    lastAnswerRef.current = null
    answeredRef.current = false
    setTally((t) =>
      answer.correct ? { ...t, correct: t.correct - 1 } : { ...t, incorrect: t.incorrect - 1 },
    )
    setFeedback(null)
    setHangingReason(null)
    setCommittedFen(null)
    setSelectedSquare(null)
    setUndoing(false)
  }

  function retryUnsaved() {
    const pending = unsaved
    setUnsaved([])
    pending.forEach(saveAnswer)
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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      {/* lg+: 12rem ≈ page chrome above/below the board. */}
      <BoardCoordinates
        show={boardColors.showCoordinates}
        orientation={prompt.color}
        className="mx-auto w-full max-w-140 shrink-0 lg:mx-0 lg:max-w-[min(42rem,calc(100dvh-12rem))]"
      >
        <div className="relative w-full overflow-hidden rounded shadow-lg">
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
          {pendingPromotion && (
            <PromotionPicker
              color={prompt.color}
              onChoose={(piece) => attemptMove(pendingPromotion.from, pendingPromotion.to, piece)}
            />
          )}
        </div>
      </BoardCoordinates>

      <div className="mx-auto flex w-full max-w-140 flex-col gap-3 lg:mx-0 lg:max-w-80">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {s.drill.cardOf(index + 1, sessionPrompts.length)}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="bg-accent h-full rounded-full transition-[width]"
              style={{ width: `${((index + (feedback ? 1 : 0)) / sessionPrompts.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PlayerAvatar username={prompt.opponentUsername} avatarUrl={prompt.opponentAvatarUrl} />
          {/* New tab: leaving the page would lose the snapshotted session. */}
          <a
            href={`/games/${prompt.gameId}?ply=${prompt.ply - 1}`}
            target="_blank"
            rel="noopener"
            className={`text-sm ${LINK_CLASS}`}
          >
            {prompt.gameLabel}
          </a>
        </div>
        <p className="font-medium">
          {prompt.sourceType === 'deviation' ? s.drill.findPreparedMove : s.drill.findBestMove}
        </p>

        {!feedback && (
          <button
            onClick={handleHint}
            disabled={hintLevel >= 3 || checking}
            className={`w-fit ${buttonClass()}`}
          >
            {s.drill.hint}
          </button>
        )}

        {hintLevel >= 1 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
          <>
            <p
              className={`text-sm ${feedback === 'incorrect' ? 'text-rose-600 dark:text-rose-400' : feedback === 'helped' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
            >
              {feedback === 'correct'
                ? s.drill.correct
                : feedback === 'alternative'
                  ? s.drill.alsoGood(prompt.correctMoves.join(` ${s.drill.or} `))
                  : feedback === 'helped'
                    ? s.drill.correctWithHelp
                    : s.drill.notQuite(prompt.correctMoves.join(` ${s.drill.or} `))}
            </p>
            {hangingReason && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {describeBlunderReason(hangingReason)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={handleNext} disabled={undoing} className={`w-fit ${buttonClass()}`}>
                {s.drill.next}
              </button>
              <button onClick={handleUndo} disabled={undoing} className={`w-fit ${buttonClass()}`}>
                {s.drill.undo}
              </button>
            </div>
            {undoError && <ErrorText>{undoError}</ErrorText>}
          </>
        )}

        {unsaved.length > 0 && (
          <ErrorText>
            {s.drill.saveFailed(unsaved.length)}{' '}
            <button onClick={retryUnsaved} className="font-medium underline">
              {s.drill.retrySave}
            </button>
          </ErrorText>
        )}

        <div className="mt-2 flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => {
                setAutoAdvance(e.target.checked)
                document.cookie = `blitzr-drill-auto-advance=${e.target.checked ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
              }}
              className="accent-accent"
            />
            {s.drill.autoAdvance}
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-600">{s.drill.keyboardHint}</p>
        </div>
      </div>
    </div>
  )
}
