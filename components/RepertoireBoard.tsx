'use client'

import { useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import Link from 'next/link'
import { Chessboard } from 'react-chessboard'
import { addRepertoireMove, deleteRepertoireMove, listRepertoire } from '@/app/actions'
import { whiteToMove } from '@/lib/drill'
import { describeHangingPieceReason, detectHangingPiece } from '@/lib/hangingPiece'
import { legalDestinations } from '@/lib/legalMoves'
import { buildRepertoireIndex } from '@/lib/repertoire'
import type { RepertoireColor, RepertoireNode } from '@/lib/types'
import { LegalMoveSquare } from './LegalMoveSquare'
import { RepertoireTree } from './RepertoireTree'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function RepertoireBoard({
  color,
  initialNodes,
}: {
  color: RepertoireColor
  initialNodes: RepertoireNode[]
}) {
  const [nodes, setNodesState] = useState(initialNodes)
  const [path, setPathState] = useState<RepertoireNode[]>([])
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // React state updates aren't applied synchronously, so two clicks fired
  // back-to-back (faster than a render) can both read the *same* pre-update
  // path/nodes — the second move then gets recorded with the wrong parent/ply,
  // or against an already-stale board position. Refs give attemptMove an
  // always-current value to read from regardless of render timing.
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
  const parentId = path.length >= 2 ? path[path.length - 2].id : null
  const parentFen = path.length >= 2 ? path[path.length - 2].fen : START_FEN
  const siblings = path.length === 0 ? (index.get(null) ?? []) : (index.get(parentId) ?? [])
  // Derived, not stored — recomputes for whatever position is current, so it
  // stays correct across every kind of navigation (new move, Back/Start, a
  // sibling branch, a click in the tree) without a separate "clear it" call
  // at each of those sites.
  const hangingReason = useMemo(
    () =>
      currentNode
        ? detectHangingPiece(
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
      // ponytail: always promote to queen — underpromotion essentially never
      // comes up while recording opening prep, and a promotion-piece picker
      // isn't worth the UI for that.
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
      setError(err instanceof Error ? err.message : 'Failed to save move.')
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
      setError(err instanceof Error ? err.message : 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Repertoire</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            onClick={() => setPath([])}
            disabled={path.length === 0}
            className="rounded-md border border-zinc-700 px-2.5 py-1 hover:bg-zinc-800 disabled:opacity-40"
          >
            ⏮ Start
          </button>
          <button
            onClick={() => setPath((p) => p.slice(0, -1))}
            disabled={path.length === 0}
            className="rounded-md border border-zinc-700 px-2.5 py-1 hover:bg-zinc-800 disabled:opacity-40"
          >
            ◀ Back
          </button>
          <span className="mx-1 h-4 w-px bg-zinc-700" />
          <HelpButton />
          <ColorTab color="white" active={color === 'white'} />
          <ColorTab color="black" active={color === 'black'} />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-col gap-3">
          <div className="w-full max-w-160 overflow-hidden rounded shadow-lg">
            <Chessboard
              options={{
                position: currentFen,
                boardOrientation: color,
                allowDragging: !deleting,
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
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              onClick={handleDelete}
              disabled={!currentNode || deleting}
              className="rounded-md border border-rose-900 px-2.5 py-1 text-rose-400 hover:bg-rose-950 disabled:opacity-40"
            >
              Delete this line
            </button>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          {hangingReason && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {describeHangingPieceReason(hangingReason)}
            </p>
          )}

          {siblings.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500">Alternatives here:</span>
              {siblings.map((sibling) => (
                <button
                  key={sibling.id}
                  onClick={() => setPath((p) => [...p.slice(0, -1), sibling])}
                  className={`rounded px-2 py-0.5 ${
                    sibling.id === currentNode?.id
                      ? 'bg-[#769656]/50 font-medium text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
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
  return (
    <Link
      href={`/repertoire?color=${color}`}
      className={`rounded-md border px-3 py-1 capitalize ${
        active
          ? 'border-[#769656] bg-[#769656]/20 text-white'
          : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
      }`}
    >
      {color}
    </Link>
  )
}

function HelpButton() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        aria-label="How to use this screen"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        ?
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close()
        }}
        className="fixed top-1/2 left-1/2 m-0 max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-700 bg-zinc-900 p-0 text-left text-zinc-100 backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">How to use this screen</h2>
            <button
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="text-zinc-500 hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-zinc-400">
            A repertoire is the set of opening moves you&rsquo;ve decided to play and practice, one
            tree per color. Building it here means picking the move(s) you want to play (or expect
            from the opponent) at each position you&rsquo;ll actually reach — so your games and
            drills check you against <em>your own plan</em>, not chess theory in general.
          </p>
          <p className="text-sm text-zinc-400">
            Drag, or click a piece then a destination, to record your prep. Playing a move
            that&rsquo;s already in the tree just navigates into it; a new move adds a branch.
            Multiple branches from the same position are fine — that&rsquo;s how you prepare for
            more than one opponent try.
          </p>
        </div>
      </dialog>
    </>
  )
}
