'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { buildPositions } from '@/lib/positions'
import { StockfishEngine } from '@/lib/stockfish/client'
import type { MyColor } from '@/lib/types'
import { BoardCoordinates } from './BoardCoordinates'
import { ErrorText } from './ErrorText'
import { NavButton, NavIcon } from './BoardNavControls'
import { LegalMoveSquare } from './LegalMoveSquare'
import { MoveList } from './MoveList'
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
  sidebar,
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
  /** Adds a sidebar with the move list, `sidebar.top` above it. `inProgress`: the user has
   *  moved and the game hasn't ended. */
  sidebar?: { top?: (inProgress: boolean) => React.ReactNode; className: string }
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
  // A ply picked in the move list to look back at; null follows the game.
  const [viewPly, setViewPly] = useState<number | null>(null)
  const positions = useMemo(() => buildPositions(initialFen, movesSan), [initialFen, movesSan])
  const shownFen = viewPly === null ? fen : positions[viewPly]
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
  useMoveSound(shownFen)

  const myTurn = viewPly === null && !outcome && !thinking && new Chess(fen).turn() === myTurnLetter
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
    setViewPly(null)
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
    // choosePromotion() calls this in the same render, while pendingPromotion is still set.
    if (!myTurn || (pendingPromotion && !promotion)) return false
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
    setViewPly(null)
  }

  function handleResign() {
    gameRef.current++
    setThinking(false)
    end(movesSan, 'lost', true)
  }

  // Back to the user's last move, dropping the engine's reply (or its search still running).
  function handleTakeBack() {
    let ply = movesSan.length - 1
    while (ply >= 0 && new Chess(positions[ply]).turn() !== myTurnLetter) ply--
    if (ply < 0) return
    gameRef.current++
    setThinking(false)
    setFen(positions[ply])
    setMovesSan(movesSan.slice(0, ply))
    setViewPly(null)
    setSelectedSquare(null)
  }

  const shownPly = viewPly ?? movesSan.length
  const goTo = (p: number) => {
    setSelectedSquare(null)
    setViewPly(p >= movesSan.length ? null : Math.max(0, p))
  }

  // ←/→ and Home/End, as on the game page, while the move list is shown.
  useEffect(() => {
    if (!sidebar) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return
      const target =
        e.key === 'ArrowLeft'
          ? shownPly - 1
          : e.key === 'ArrowRight'
            ? shownPly + 1
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? movesSan.length
                : null
      if (target === null) return
      e.preventDefault()
      goTo(target)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

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

  const status = (
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
              : s.endgamePlayout.yourMove(s.common.color[myColor], Number(fen.split(' ')[5]))}
    </p>
  )
  const canTakeBack = myMoves > 0 && !pendingPromotion

  const boardColumn = (
    <div className={`flex w-full shrink-0 flex-col gap-3 ${boardMaxWidthClassName}`}>
      {/* With a sidebar, the status and buttons live there instead. */}
      {!sidebar && (
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          {status}
          <div className="flex shrink-0 gap-2">
            {allowResign && !outcome && (
              <>
                <button onClick={handleTakeBack} disabled={!canTakeBack} className={buttonClass()}>
                  {s.playBot.takeBack}
                </button>
                <button onClick={handleResign} className={buttonClass()}>
                  {s.playBot.resign}
                </button>
              </>
            )}
            <button onClick={handleRestart} className={buttonClass()}>
              {s.lessonQuiz.restart}
            </button>
          </div>
        </div>
      )}

      <BoardCoordinates show={boardColors.showCoordinates} orientation={myColor} className="w-full">
        <div className="relative w-full overflow-hidden rounded shadow-lg">
          <Chessboard
            options={{
              position: shownFen,
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

  if (!sidebar) return boardColumn
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:justify-center">
      {boardColumn}
      {/* The content is absolute at lg+, so the move list can't grow the row past the board. */}
      {/* mb-7: end level with the board, not the file labels under it. */}
      <div
        className={`relative w-full ${boardColors.showCoordinates ? 'lg:mb-7' : ''} ${sidebar.className}`}
      >
        <div className="flex flex-col gap-3 lg:absolute lg:inset-0">
          {sidebar.top?.(myMoves > 0 && !outcome)}
          {status}
          <MoveList
            movesSan={movesSan}
            ply={shownPly}
            onSelect={goTo}
            positions={positions}
            myColor={myColor}
          />
          <div className="flex shrink-0 items-center gap-2">
            <NavButton
              onClick={() => goTo(0)}
              disabled={shownPly === 0}
              label={s.board.navLabels.start}
            >
              <NavIcon d="M7 5v14M18 6l-6 6 6 6" />
            </NavButton>
            <NavButton
              onClick={() => goTo(shownPly - 1)}
              disabled={shownPly === 0}
              label={s.board.navLabels.previous}
            >
              <NavIcon d="M15 6l-6 6 6 6" />
            </NavButton>
            <NavButton
              onClick={() => goTo(shownPly + 1)}
              disabled={viewPly === null}
              label={s.board.navLabels.next}
            >
              <NavIcon d="M9 6l6 6-6 6" />
            </NavButton>
            <NavButton
              onClick={() => goTo(movesSan.length)}
              disabled={viewPly === null}
              label={s.board.navLabels.end}
            >
              <NavIcon d="M17 5v14M6 6l6 6-6 6" />
            </NavButton>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {allowResign && !outcome && (
              <>
                <NavButton
                  onClick={handleTakeBack}
                  disabled={!canTakeBack}
                  label={s.playBot.takeBack}
                >
                  <NavIcon d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
                </NavButton>
                <NavButton onClick={handleResign} disabled={false} label={s.playBot.resign}>
                  <NavIcon d="M5 21V4h12l-2 4 2 4H5" />
                </NavButton>
              </>
            )}
            <NavButton onClick={handleRestart} disabled={false} label={s.playBot.restart}>
              <NavIcon d="M3 12a9 9 0 1 0 3-6.7M3 3v5h5" />
            </NavButton>
          </div>
        </div>
      </div>
    </div>
  )
}
