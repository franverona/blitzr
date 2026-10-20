'use client'

import { useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import Link from 'next/link'
import { Chessboard } from 'react-chessboard'
import { BoardCoordinates } from './BoardCoordinates'
import { addRepertoireMove, deleteRepertoireMove, listRepertoire } from '@/app/actions'
import { whiteToMove } from '@/lib/drill'
import { getStrings } from '@/lib/i18n/strings'
import { legalDestinations } from '@/lib/legalMoves'
import { START_FEN } from '@/lib/positions'
import { buildRepertoireIndex } from '@/lib/repertoire'
import { describeBlunderReason, detectBlunderReason } from '@/lib/tactics'
import { BOARD_ANIMATION_DURATION_MS } from '@/lib/theme'
import type { RepertoireColor, RepertoireNode } from '@/lib/types'
import { useSettings, useMoveSound } from './SettingsProvider'
import { LegalMoveSquare } from './LegalMoveSquare'
import { RepertoireTree } from './RepertoireTree'
import { Dialog } from './Dialog'
import { ErrorText } from './ErrorText'
import { IconButton } from './IconButton'
import { PageHeader } from './PageHeader'
import { buttonClass, chipClass } from './styles'

export function RepertoireBoard({
  color,
  initialNodes,
}: {
  color: RepertoireColor
  initialNodes: RepertoireNode[]
}) {
  const s = getStrings()
  const boardColors = useSettings()
  const [nodes, setNodesState] = useState(initialNodes)
  const [path, setPathState] = useState<RepertoireNode[]>([])
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Refs so two moves fired faster than a render don't both read the same
  // stale path/nodes.
  const nodesRef = useRef(nodes)
  const pathRef = useRef(path)

  function setNodes(updater: (prev: RepertoireNode[]) => RepertoireNode[]) {
    nodesRef.current = updater(nodesRef.current)
    setNodesState(nodesRef.current)
  }

  function setPath(updater: RepertoireNode[] | ((prev: RepertoireNode[]) => RepertoireNode[])) {
    pathRef.current = typeof updater === 'function' ? updater(pathRef.current) : updater
    setPathState(pathRef.current)
  }

  const index = useMemo(() => buildRepertoireIndex(nodes), [nodes])
  const currentNode = path[path.length - 1] ?? null
  const currentFen = currentNode?.fen ?? START_FEN
  useMoveSound(currentFen)
  const parentId = path.length >= 2 ? path[path.length - 2].id : null
  const parentFen = path.length >= 2 ? path[path.length - 2].fen : START_FEN
  const siblings = path.length === 0 ? (index.get(null) ?? []) : (index.get(parentId) ?? [])
  const hangingReason = useMemo(
    () =>
      currentNode
        ? detectBlunderReason(
            parentFen,
            currentNode.fen,
            whiteToMove(currentNode.ply) ? 'white' : 'black',
          )
        : null,
    [currentNode, parentFen],
  )
  const legalMoves = useMemo(
    () => (selectedSquare ? legalDestinations(currentFen, selectedSquare) : []),
    [selectedSquare, currentFen],
  )
  const legalMoveMap = useMemo(
    () => new Map(legalMoves.map((m) => [m.to, m.isCapture])),
    [legalMoves],
  )

  function attemptMove(from: string, to: string): boolean {
    const currentPath = pathRef.current
    const current = currentPath[currentPath.length - 1] ?? null
    const kids = buildRepertoireIndex(nodesRef.current).get(current?.id ?? null) ?? []
    const fen = current?.fen ?? START_FEN

    const chess = new Chess(fen)
    let move
    try {
      // ponytail: always promote to queen; underpromotion doesn't come up in opening prep.
      move = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    if (!move) return false

    const existing = kids.find((n) => n.moveSan === move.san)
    if (existing) {
      setPath((p) => [...p, existing])
      return true
    }

    const node: RepertoireNode = {
      id: crypto.randomUUID(),
      color,
      parentId: current?.id ?? null,
      ply: currentPath.length + 1,
      moveSan: move.san,
      fen: chess.fen(),
      createdAt: new Date().toISOString(),
    }
    setNodes((prev) => [...prev, node])
    setPath((p) => [...p, node])
    setError(null)

    addRepertoireMove(node).catch((err) => {
      setNodes((prev) => prev.filter((n) => n.id !== node.id))
      setPath((p) => p.filter((n) => n.id !== node.id))
      setError(err instanceof Error ? err.message : s.repertoire.failedToSave)
    })

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

  async function handleDelete() {
    if (!currentNode) return
    setDeleting(true)
    setError(null)
    try {
      await deleteRepertoireMove(currentNode.id)
      const fresh = await listRepertoire(color)
      setNodes(() => fresh)
      setPath((p) => p.slice(0, -1))
    } catch (err) {
      setError(err instanceof Error ? err.message : s.repertoire.failedToDelete)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={s.repertoire.title}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              onClick={() => setPath([])}
              disabled={path.length === 0}
              className={buttonClass({ size: 'sm' })}
            >
              {s.repertoire.start}
            </button>
            <button
              onClick={() => setPath((p) => p.slice(0, -1))}
              disabled={path.length === 0}
              className={buttonClass({ size: 'sm' })}
            >
              {s.repertoire.back}
            </button>
            <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            <HelpButton />
            <ColorTab color="white" active={color === 'white'} />
            <ColorTab color="black" active={color === 'black'} />
          </div>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-col gap-3">
          <BoardCoordinates
            show={boardColors.showCoordinates}
            orientation={color}
            className="w-full"
          >
            {/* lg+: 14rem ≈ chrome above/below the board. */}
            <div className="w-full max-w-160 overflow-hidden rounded shadow-lg lg:max-w-[min(40rem,calc(100dvh-14rem))]">
              <Chessboard
                options={{
                  position: currentFen,
                  boardOrientation: color,
                  allowDragging: !deleting,
                  animationDurationInMs: BOARD_ANIMATION_DURATION_MS,
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
                  darkSquareStyle: { backgroundColor: boardColors.dark },
                  lightSquareStyle: { backgroundColor: boardColors.light },
                  showNotation: false,
                }}
              />
            </div>
          </BoardCoordinates>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              onClick={handleDelete}
              disabled={!currentNode || deleting}
              className={buttonClass({ variant: 'danger', size: 'sm' })}
            >
              {s.repertoire.deleteLine}
            </button>
          </div>

          {error && <ErrorText>{error}</ErrorText>}
          {hangingReason && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {describeBlunderReason(hangingReason)}
            </p>
          )}

          {siblings.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">{s.repertoire.alternativesHere}</span>
              {siblings.map((sibling) => (
                <button
                  key={sibling.id}
                  onClick={() => setPath((p) => [...p.slice(0, -1), sibling])}
                  className={`rounded px-2 py-0.5 ${
                    sibling.id === currentNode?.id
                      ? 'bg-accent/50 font-medium text-zinc-900 dark:text-white'
                      : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {sibling.moveSan}
                </button>
              ))}
            </div>
          )}
        </div>

        <RepertoireTree nodes={nodes} currentPath={path} onSelectPath={setPath} />
      </div>
    </div>
  )
}

function ColorTab({ color, active }: { color: RepertoireColor; active: boolean }) {
  const s = getStrings()
  return (
    <Link href={`/repertoire?color=${color}`} className={chipClass(active)}>
      {s.common.color[color]}
    </Link>
  )
}

function HelpButton() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const s = getStrings()

  return (
    <>
      <IconButton
        onClick={() => dialogRef.current?.showModal()}
        aria-label={s.repertoire.helpAriaLabel}
      >
        ?
      </IconButton>
      <Dialog ref={dialogRef} title={s.repertoire.helpTitle}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.repertoire.helpP1}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.repertoire.helpP2}</p>
      </Dialog>
    </>
  )
}
