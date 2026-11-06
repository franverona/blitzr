'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { StockfishEngine } from '@/lib/stockfish/client'
import type { MyColor } from '@/lib/types'
import { BoardCoordinates } from './BoardCoordinates'
import { ErrorText } from './ErrorText'
import { LegalMoveSquare } from './LegalMoveSquare'
import { PromotionPicker, type PromotionPiece } from './PromotionPicker'
import { useMoveSound, useSettings } from './SettingsProvider'
import { buttonClass } from './styles'

export type PlayoutOutcome = 'won' | 'drawn' | 'lost'

function finished(
  chess: Chess,
  myColor: MyColor,
  promoted: boolean,
  goalIsPromotion: boolean,
): PlayoutOutcome | null {
  if (chess.isCheckmate()) return chess.turn() === myColor[0] ? 'lost' : 'won'
  if (promoted && goalIsPromotion) return 'won'
  return chess.isDraw() || chess.isStalemate() ? 'drawn' : null
}

export interface PlayoutMessages {
  thinking: string
  won: (myMoves: number) => string
  drawn: string
  lost: string
}

/**
 * A position played out against Stockfish, the user on `myColor`. The engine moves first when
 * it's its turn. Won at mate, or at promotion when `goalIsPromotion`.
 */
export function PlayoutBoard({
  initialFen,
  myColor,
  engineOptions = [],
  movetimeMs,
  goalIsPromotion = false,
  allowResign = false,
  messages,
  onGameOver,
  boardMaxWidthClassName,
  footer,
}: {
  initialFen: string
  myColor: MyColor
  /** `setoption` commands sent once, before the engine's first search. */
  engineOptions?: string[]
  movetimeMs: number
  goalIsPromotion?: boolean
  allowResign?: boolean
  messages: PlayoutMessages
  onGameOver?: (movesSan: string[], outcome: PlayoutOutcome, resigned: boolean) => void
  boardMaxWidthClassName: string
  footer?: React.ReactNode
}) {
  const s = getStrings()
  const boardColors = useSettings()
  const myTurnLetter = myColor[0]
  const startsWithMe = new Chess(initialFen).turn() === myTurnLetter
  // A game page's final ply can already be mate or a draw: nothing left to play.
  const initialOutcome = finished(new Chess(initialFen), myColor, false, false)
  const engineOpens = !startsWithMe && !initialOutcome

  const [fen, setFen] = useState(initialFen)
  const [movesSan, setMovesSan] = useState<string[]>([])
  const [outcome, setOutcome] = useState<PlayoutOutcome | null>(initialOutcome)
  const [thinking, setThinking] = useState(engineOpens)
  const [engineFailed, setEngineFailed] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null,
  )
  // Bumped on restart, so a reply still in flight for the old game is dropped.
  const gameRef = useRef(0)
  const [gameCount, setGameCount] = useState(0)
  const engineRef = useRef<Promise<StockfishEngine> | null>(null)
  // One search at a time on the worker: a restart mid-search queues the next one behind it.
  const searchRef = useRef<Promise<unknown>>(Promise.resolve())
  // Reset, not just terminated: Strict Mode remounts, and a dead worker's search never settles.
  useEffect(
    () => () => {
      void engineRef.current?.then((e) => e.terminate())
      engineRef.current = null
      searchRef.current = Promise.resolve()
    },
    [],
  )
  useMoveSound(fen)

  const myTurn = !outcome && !thinking && new Chess(fen).turn() === myTurnLetter
  const myMoves = startsWithMe ? Math.ceil(movesSan.length / 2) : Math.floor(movesSan.length / 2)
  const legalMoves = useMemo(
    () => (selectedSquare ? legalDestinations(fen, selectedSquare) : []),
    [selectedSquare, fen],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  function end(line: string[], result: PlayoutOutcome | null, resigned = false) {
    setOutcome(result)
    if (result) onGameOver?.(line, result, resigned)
  }

  function getEngine(): Promise<StockfishEngine> {
    return (engineRef.current ??= (async () => {
      const engine = new StockfishEngine()
      if (engineOptions.length > 0) await engine.configure(engineOptions)
      return engine
    })())
  }

  /** The engine's move for `afterFen`; sets no state, so an effect can start it. */
  async function searchMove(afterFen: string): Promise<string | null> {
    const search = searchRef.current.then(async () =>
      (await getEngine()).evaluate(afterFen, movetimeMs),
    )
    searchRef.current = search.catch(() => {})
    return (await search).bestMove?.san ?? null
  }

  function applyEngineMove(afterFen: string, line: string[], san: string | null) {
    setThinking(false)
    if (!san) return
    const chess = new Chess(afterFen)
    const move = chess.move(san)
    const next = [...line, move.san]
    setFen(chess.fen())
    setMovesSan(next)
    end(next, finished(chess, myColor, false, goalIsPromotion))
  }

  function engineFailure() {
    setEngineFailed(true)
    setThinking(false)
  }

  function engineReply(afterFen: string, line: string[]) {
    const game = gameRef.current
    setThinking(true)
    searchMove(afterFen).then(
      (san) => game === gameRef.current && applyEngineMove(afterFen, line, san),
      () => game === gameRef.current && engineFailure(),
    )
  }

  // The engine opens when the position starts on its side; re-run on every restart.
  useEffect(() => {
    if (!engineOpens) return
    let cancelled = false
    searchMove(initialFen).then(
      (san) => !cancelled && applyEngineMove(initialFen, [], san),
      () => !cancelled && engineFailure(),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCount])

  function attemptMove(from: string, to: string, promotion?: PromotionPiece): boolean {
    if (!myTurn || pendingPromotion) return false
    if (!promotion && legalDestinations(fen, from).some((m) => m.to === to && m.isPromotion)) {
      setPendingPromotion({ from, to })
      return false
    }
    const chess = new Chess(fen)
    let move
    try {
      move = chess.move({ from, to, promotion })
    } catch {
      return false
    }
    const next = [...movesSan, move.san]
    setSelectedSquare(null)
    setFen(chess.fen())
    setMovesSan(next)
    const result = finished(chess, myColor, Boolean(move.promotion), goalIsPromotion)
    end(next, result)
    if (!result) engineReply(chess.fen(), next)
    return true
  }

  function choosePromotion(promotion: PromotionPiece) {
    if (!pendingPromotion) return
    const { from, to } = pendingPromotion
    setPendingPromotion(null)
    attemptMove(from, to, promotion)
  }

  function handleRestart() {
    gameRef.current++
    setGameCount((n) => n + 1)
    setFen(initialFen)
    setMovesSan([])
    setOutcome(initialOutcome)
    setThinking(engineOpens)
    setEngineFailed(false)
    setSelectedSquare(null)
    setPendingPromotion(null)
  }

  function handleResign() {
    gameRef.current++
    setThinking(false)
    end(movesSan, 'lost', true)
  }

  function handleSquareClick({ square, piece }: { square: string; piece: unknown | null }) {
    if (!myTurn) return
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null)
        return
      }
      const moved = attemptMove(selectedSquare, square)
      setSelectedSquare(!moved && piece && !pendingPromotion ? square : null)
      return
    }
    if (piece) setSelectedSquare(square)
  }

  return (
    <div className={`flex w-full shrink-0 flex-col gap-3 ${boardMaxWidthClassName}`}>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <p
          className={
            outcome === 'won'
              ? 'text-lg font-medium text-emerald-600 dark:text-emerald-400'
              : outcome === 'lost'
                ? 'text-lg font-medium text-red-600 dark:text-red-400'
                : 'text-sm text-zinc-500 dark:text-zinc-400'
          }
        >
          {outcome === 'won'
            ? messages.won(myMoves)
            : outcome === 'drawn'
              ? messages.drawn
              : outcome === 'lost'
                ? messages.lost
                : thinking
                  ? messages.thinking
                  : s.endgamePlayout.yourMove(s.common.color[myColor], myMoves + 1)}
        </p>
        <div className="flex shrink-0 gap-2">
          {allowResign && !outcome && (
            <button onClick={handleResign} className={buttonClass()}>
              {s.playBot.resign}
            </button>
          )}
          <button onClick={handleRestart} className={buttonClass()}>
            {s.lessonQuiz.restart}
          </button>
        </div>
      </div>

      <BoardCoordinates show={boardColors.showCoordinates} orientation={myColor} className="w-full">
        <div className="relative w-full overflow-hidden rounded shadow-lg">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: myColor,
              allowDragging: myTurn && !pendingPromotion,
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                targetSquare ? attemptMove(sourceSquare, targetSquare) : false,
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
            }}
          />
          {pendingPromotion && <PromotionPicker color={myColor} onChoose={choosePromotion} />}
        </div>
      </BoardCoordinates>

      {footer}
      {engineFailed && <ErrorText>{s.endgamePlayout.engineFailed}</ErrorText>}
    </div>
  )
}
