'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { StockfishEngine } from '@/lib/stockfish/client'
import type { Lesson } from '@/lib/types'
import { BoardCoordinates } from './BoardCoordinates'
import { ErrorText } from './ErrorText'
import { LegalMoveSquare } from './LegalMoveSquare'
import { useMoveSound, useSettings } from './SettingsProvider'
import { buttonClass } from './styles'

// Enough to defend K+Q/K+R vs K well; the engine never has a real choice to make.
const ENGINE_MOVETIME_MS = 300

type Outcome = 'won' | 'drawn' | null

/**
 * An endgame lesson's position played out against Stockfish: the user has the lesson's side, the
 * engine defends. Won at mate, or at promotion for a lesson whose line ends in one.
 */
export function EndgamePlayout({ lesson }: { lesson: Lesson }) {
  const s = getStrings()
  const boardColors = useSettings()
  const myColor = lesson.primaryColor
  const goalIsPromotion = lesson.moves.at(-1)?.san.includes('=') ?? false

  const [fen, setFen] = useState(lesson.initialFen)
  const [moves, setMoves] = useState(0)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [thinking, setThinking] = useState(false)
  const [engineFailed, setEngineFailed] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  // Bumped on restart, so a reply still in flight for the old game is dropped.
  const gameRef = useRef(0)
  const engineRef = useRef<StockfishEngine | null>(null)
  // One search at a time on the worker: a restart mid-search queues the next one behind it.
  const searchRef = useRef<Promise<unknown>>(Promise.resolve())
  useEffect(() => () => engineRef.current?.terminate(), [])
  useMoveSound(fen)

  const myTurn = !outcome && !thinking && new Chess(fen).turn() === myColor[0]
  const legalMoves = useMemo(
    () => (selectedSquare ? legalDestinations(fen, selectedSquare) : []),
    [selectedSquare, fen],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  function finished(chess: Chess, promoted: boolean): Outcome {
    if (chess.isCheckmate()) return chess.turn() === myColor[0] ? 'drawn' : 'won'
    if (promoted && goalIsPromotion) return 'won'
    return chess.isDraw() || chess.isStalemate() ? 'drawn' : null
  }

  async function engineReply(afterFen: string) {
    const game = gameRef.current
    setThinking(true)
    try {
      const engine = (engineRef.current ??= new StockfishEngine())
      const search = searchRef.current.then(() => engine.evaluate(afterFen, ENGINE_MOVETIME_MS))
      searchRef.current = search.catch(() => {})
      const { bestMove } = await search
      if (game !== gameRef.current || !bestMove) return
      const chess = new Chess(afterFen)
      chess.move(bestMove.san)
      setFen(chess.fen())
      setOutcome(finished(chess, false))
    } catch {
      if (game === gameRef.current) setEngineFailed(true)
    } finally {
      if (game === gameRef.current) setThinking(false)
    }
  }

  function attemptMove(from: string, to: string): boolean {
    if (!myTurn) return false
    const chess = new Chess(fen)
    let move
    try {
      // shortcut: always a queen; no endgame lesson needs an underpromotion.
      move = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    setSelectedSquare(null)
    setFen(chess.fen())
    setMoves((m) => m + 1)
    const result = finished(chess, Boolean(move.promotion))
    setOutcome(result)
    if (!result) engineReply(chess.fen())
    return true
  }

  function handleRestart() {
    gameRef.current++
    setFen(lesson.initialFen)
    setMoves(0)
    setOutcome(null)
    setThinking(false)
    setEngineFailed(false)
    setSelectedSquare(null)
  }

  function handleSquareClick({ square, piece }: { square: string; piece: unknown | null }) {
    if (!myTurn) return
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

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      {/* lg+: 17rem ≈ chrome above/below the board, as in LessonQuiz. */}
      <div className="flex w-full max-w-140 shrink-0 flex-col gap-3 lg:max-w-[min(35rem,calc(100dvh-17rem))]">
        <div className="flex h-9 items-center justify-between gap-2">
          <p
            className={
              outcome === 'won'
                ? 'text-lg font-medium text-emerald-600 dark:text-emerald-400'
                : 'text-sm text-zinc-500 dark:text-zinc-400'
            }
          >
            {outcome === 'won'
              ? s.endgamePlayout.won(moves)
              : outcome === 'drawn'
                ? s.endgamePlayout.drawn
                : thinking
                  ? s.endgamePlayout.engineThinking
                  : s.endgamePlayout.yourMove(s.common.color[myColor], moves + 1)}
          </p>
          <button onClick={handleRestart} className={`shrink-0 ${buttonClass()}`}>
            {s.lessonQuiz.restart}
          </button>
        </div>

        <BoardCoordinates
          show={boardColors.showCoordinates}
          orientation={myColor}
          className="w-full"
        >
          <div className="w-full overflow-hidden rounded shadow-lg">
            <Chessboard
              options={{
                position: fen,
                boardOrientation: myColor,
                allowDragging: myTurn,
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
          </div>
        </BoardCoordinates>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {goalIsPromotion ? s.endgamePlayout.goalPromotion : s.endgamePlayout.goalMate}
        </p>
        {engineFailed && <ErrorText>{s.endgamePlayout.engineFailed}</ErrorText>}
      </div>
    </div>
  )
}
