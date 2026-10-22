'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { describeEval, formatEval } from '@/lib/analysis'
import { buildPositionChecklist, findingMarks } from '@/lib/checklist'
import { whiteToMove } from '@/lib/drill'
import { gameEndBadges } from '@/lib/gameEnd'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { formatMaterialDiff, materialDiff } from '@/lib/material'
import {
  BOARD_ANIMATION_DURATION_MS,
  CHECKLIST_ARROW_COLOR,
  CHECKLIST_SQUARE_COLOR,
  GAME_END_SQUARE_COLORS,
  REVEAL_ARROW_COLOR,
} from '@/lib/theme'
import type { PositionEval } from '@/lib/types'
import { useSettings, useMoveSound } from './SettingsProvider'
import { EvalBar } from './EvalBar'
import { LegalMoveSquare } from './LegalMoveSquare'
import { MoveList } from './MoveList'
import { PromotionPicker } from './PromotionPicker'
import { useBoardContext } from './BoardContext'
import { useLiveAnalysisContext } from './LiveAnalysis'
import { GameEndBadge } from './GameEndBadge'

export function BoardView({
  boardMaxWidthClassName = 'max-w-160',
  sidebarMaxWidthClassName = 'lg:max-w-sm xl:max-w-md',
  sidebarExtra,
  sidebarTop,
  autoExplore = false,
}: {
  boardMaxWidthClassName?: string
  /** Moving a piece on the recorded game enters explore mode. */
  autoExplore?: boolean
  /** The game page narrows it so its nav controls span the whole row. */
  sidebarMaxWidthClassName?: string
  /** Content below the move list. Keep it short — the move list fills the
   *  remaining height. */
  sidebarExtra?: React.ReactNode
  /** Content above the move list. */
  sidebarTop?: React.ReactNode
} = {}) {
  const {
    ply,
    positions,
    myColor,
    boardOrientation,
    result,
    finalResults,
    movesSan,
    evals,
    setPly,
    exploring,
    explorePly,
    displayFen,
    exitExploring,
    attemptExploreMove,
  } = useBoardContext()
  const s = getStrings()
  const boardColors = useSettings()
  const { lines: liveLines, fen: liveFen } = useLiveAnalysisContext()
  useMoveSound(displayFen)
  // The eval bar uses the latest completed search even if it's for the
  // previous position, so it doesn't blink on every step.
  const liveEval: PositionEval | undefined = liveLines?.[0]
    ? { cp: liveLines[0].cp, mate: liveLines[0].mate, bestMove: null }
    : undefined
  // Saved analysis wins on the recorded game; live is the fallback and the
  // only source while exploring.
  const barEval = exploring ? liveEval : (evals?.[ply] ?? liveEval)
  // Unlike the bar, a stale arrow would point at the wrong squares.
  const liveLine =
    !boardColors.hideEngineHints && liveFen === displayFen
      ? (liveLines?.[0] ?? undefined)
      : undefined
  // Unique id required: two boards on one page (this + PlanBoard) crash otherwise.
  const boardId = useId()
  // Saved suggestion only for the user's own moves, and not while exploring
  // (it belongs to the recorded ply).
  const bestMove =
    !exploring && whiteToMove(ply + 1, positions[0]) === (myColor === 'white')
      ? evals?.[ply]?.bestMove
      : undefined

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const canMove = exploring || autoExplore
  const legalMoves = useMemo(
    () => (canMove && selectedSquare ? legalDestinations(displayFen, selectedSquare) : []),
    [canMove, selectedSquare, displayFen],
  )
  // Dropped on navigation, so a stale selection can't hide the board's marks.
  const [selectionFen, setSelectionFen] = useState(displayFen)
  if (selectionFen !== displayFen) {
    setSelectionFen(displayFen)
    setSelectedSquare(null)
  }
  const showLegalMoves = exploring || selectedSquare !== null
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  // Keyed to the FEN it was opened on, so navigating away hides it.
  const [pendingPromotion, setPendingPromotion] = useState<{
    fen: string
    from: string
    to: string
  } | null>(null)
  const activePromotion = pendingPromotion?.fen === displayFen ? pendingPromotion : null

  function tryExploreMove(from: string, to: string): boolean {
    if (activePromotion) return false
    if (legalDestinations(displayFen, from).some((m) => m.to === to && m.isPromotion)) {
      setPendingPromotion({ fen: displayFen, from, to })
      return true
    }
    return attemptExploreMove(from, to)
  }

  function handleExploreDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string
    targetSquare: string | null
  }): boolean {
    if (!targetSquare) return false
    return tryExploreMove(sourceSquare, targetSquare)
  }

  function handleExploreSquareClick({ square, piece }: { square: string; piece: unknown | null }) {
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null)
        return
      }
      const moved = tryExploreMove(selectedSquare, square)
      setSelectedSquare(!moved && piece ? square : null)
      return
    }
    if (piece) setSelectedSquare(square)
  }

  const checklistSquareStyles = useMemo(() => {
    const findings = buildPositionChecklist(positions[ply])
    const styles: Record<string, React.CSSProperties> = {}
    // react-chessboard keys arrows by start/end square, so dedupe.
    const arrowsByKey = new Map<string, { startSquare: string; endSquare: string; color: string }>()
    for (const f of findings) {
      const marks = findingMarks(f.reason)
      for (const square of marks.squares) {
        styles[square] = { backgroundColor: CHECKLIST_SQUARE_COLOR }
      }
      for (const [startSquare, endSquare] of marks.arrows) {
        arrowsByKey.set(`${startSquare}-${endSquare}`, {
          startSquare,
          endSquare,
          color: CHECKLIST_ARROW_COLOR,
        })
      }
    }
    return { styles, arrows: [...arrowsByKey.values()] }
  }, [positions, ply])
  // Same dedupe as above. The live arrow wins over the saved one on collision.
  const boardArrows = useMemo(() => {
    const arrows = new Map<string, { startSquare: string; endSquare: string; color: string }>()
    if (!exploring) {
      for (const arrow of checklistSquareStyles.arrows) {
        arrows.set(`${arrow.startSquare}-${arrow.endSquare}`, arrow)
      }
      if (bestMove && !boardColors.hideEngineHints) {
        arrows.set(`${bestMove.from}-${bestMove.to}`, {
          startSquare: bestMove.from,
          endSquare: bestMove.to,
          color: REVEAL_ARROW_COLOR,
        })
      }
    }
    if (liveLine) {
      arrows.set(`${liveLine.move.from}-${liveLine.move.to}`, {
        startSquare: liveLine.move.from,
        endSquare: liveLine.move.to,
        color: REVEAL_ARROW_COLOR,
      })
    }
    return [...arrows.values()]
  }, [checklistSquareStyles.arrows, bestMove, exploring, liveLine, boardColors.hideEngineHints])

  // The position shows mate/draw itself; resignations and timeouts (most
  // games) only get a badge on the recorded final ply.
  const gameEndBadgeList = useMemo(() => {
    const atRecordedEnd = !exploring && ply === positions.length - 1
    const kings = new Map(
      new Chess(displayFen)
        .board()
        .flat()
        .flatMap((cell) =>
          cell?.type === 'k'
            ? [[cell.color === 'w' ? 'white' : 'black', cell.square] as const]
            : [],
        ),
    )
    return gameEndBadges(displayFen, atRecordedEnd ? finalResults : undefined).flatMap((b) => {
      const square = kings.get(b.color)
      return square ? [{ square, variant: b.variant, label: s.board.endReasons[b.reason] }] : []
    })
  }, [displayFen, exploring, ply, positions.length, finalResults, s])
  const boardSquareStyles = useMemo(() => {
    const styles = { ...checklistSquareStyles.styles }
    for (const badge of gameEndBadgeList) {
      styles[badge.square] = { backgroundColor: GAME_END_SQUARE_COLORS[badge.variant] }
    }
    return styles
  }, [checklistSquareStyles.styles, gameEndBadgeList])

  // Only animate single-step moves; multi-ply jumps flicker. Switching between
  // recorded and explore modes counts as a jump.
  const navPly = exploring ? explorePly : ply
  const [prevNavPly, setPrevNavPly] = useState(navPly)
  const [prevExploring, setPrevExploring] = useState(exploring)
  const [isAdjacentStep, setIsAdjacentStep] = useState(false)
  if (navPly !== prevNavPly || exploring !== prevExploring) {
    setIsAdjacentStep(exploring === prevExploring && Math.abs(navPly - prevNavPly) === 1)
    setPrevNavPly(navPly)
    setPrevExploring(exploring)
  }

  // At lg+, pin the sidebar to the board column's measured height so the move
  // list fills it. CSS stretch can't: the list's own content would drive the row.
  const boardColumnRef = useRef<HTMLDivElement>(null)
  const [sidebarHeight, setSidebarHeight] = useState<number | undefined>(undefined)
  useEffect(() => {
    const el = boardColumnRef.current
    if (!el) return
    const query = window.matchMedia('(min-width: 1024px)')
    const measure = () =>
      setSidebarHeight(query.matches ? el.getBoundingClientRect().height : undefined)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    query.addEventListener('change', measure)
    return () => {
      observer.disconnect()
      query.removeEventListener('change', measure)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
      <div
        ref={boardColumnRef}
        className={`flex w-full shrink-0 flex-col gap-3 ${boardMaxWidthClassName}`}
      >
        <div className="flex items-stretch gap-2">
          {barEval && !boardColors.hideEngineHints && (
            <EvalBar
              evaluation={barEval}
              boardOrientation={boardOrientation}
              className={boardColors.showCoordinates ? 'mb-7' : ''}
            />
          )}
          <BoardCoordinates
            show={boardColors.showCoordinates}
            orientation={boardOrientation}
            className="w-full min-w-0"
          >
            <div className={`relative w-full ${boardMaxWidthClassName}`}>
              <div className="w-full overflow-hidden rounded shadow-lg">
                <Chessboard
                  options={{
                    id: boardId,
                    position: displayFen,
                    boardOrientation,
                    allowDragging: canMove,
                    onPieceDrop: canMove ? handleExploreDrop : undefined,
                    onSquareClick: canMove ? handleExploreSquareClick : undefined,
                    // squareRenderer overrides squareStyles, so only use it while
                    // exploring or picking a move.
                    squareRenderer: showLegalMoves
                      ? ({ square, children }) => (
                          <LegalMoveSquare
                            isSelected={square === selectedSquare}
                            isLegalMove={legalMoveMap.has(square)}
                            isCapture={legalMoveMap.get(square) ?? false}
                          >
                            {children}
                          </LegalMoveSquare>
                        )
                      : undefined,
                    showAnimations: isAdjacentStep,
                    animationDurationInMs: BOARD_ANIMATION_DURATION_MS,
                    darkSquareStyle: { backgroundColor: boardColors.dark },
                    lightSquareStyle: { backgroundColor: boardColors.light },
                    showNotation: false,
                    squareStyles: showLegalMoves ? undefined : boardSquareStyles,
                    arrows: boardArrows,
                  }}
                />
              </div>
              {canMove && activePromotion && (
                <PromotionPicker
                  color={displayFen.split(' ')[1] === 'b' ? 'black' : 'white'}
                  onChoose={(piece) => {
                    setPendingPromotion(null)
                    attemptExploreMove(activePromotion.from, activePromotion.to, piece)
                  }}
                />
              )}
              {gameEndBadgeList.map((badge) => (
                <GameEndBadge
                  key={`${badge.variant}-${badge.square}`}
                  square={badge.square}
                  label={badge.label}
                  variant={badge.variant}
                  boardOrientation={boardOrientation}
                />
              ))}
            </div>
          </BoardCoordinates>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-zinc-400">
          <p>
            {s.board.material} {formatMaterialDiff(materialDiff(displayFen))}
            {barEval && (
              <>
                {' '}
                · {describeEval(barEval)} ({formatEval(barEval)})
              </>
            )}
          </p>
          {exploring && (
            <p className="flex items-center gap-1.5">
              <span className="text-accent font-medium">{s.board.exploring}</span>·
              <button
                onClick={exitExploring}
                className="underline hover:text-zinc-900 dark:hover:text-white"
              >
                {s.board.backToGame}
              </button>
              <kbd className="rounded border border-zinc-300 px-1 font-sans dark:border-zinc-700">
                Esc
              </kbd>
            </p>
          )}
        </div>
      </div>

      <div
        className={`flex min-h-0 w-full flex-col gap-4 lg:flex-1 ${sidebarMaxWidthClassName}`}
        style={sidebarHeight ? { height: sidebarHeight } : undefined}
      >
        {sidebarTop}
        <MoveList
          movesSan={movesSan}
          ply={ply}
          onSelect={(p) => {
            // Clicking a recorded move leaves explore mode.
            if (exploring) exitExploring()
            setPly(p)
          }}
          result={result}
          evals={evals}
          positions={positions}
          myColor={myColor}
        />
        {sidebarExtra}
      </div>
    </div>
  )
}
