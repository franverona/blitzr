'use client'

import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { addRepertoireMove, deleteRepertoireMove, listRepertoire } from '@/app/actions'
import { buildRepertoireIndex } from '@/lib/repertoire'
import type { RepertoireColor, RepertoireNode } from '@/lib/types'
import { RepertoireTree } from './RepertoireTree'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function RepertoireBoard({
  color,
  initialNodes,
}: {
  color: RepertoireColor
  initialNodes: RepertoireNode[]
}) {
  const [nodes, setNodes] = useState(initialNodes)
  const [path, setPath] = useState<RepertoireNode[]>([])
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const index = useMemo(() => buildRepertoireIndex(nodes), [nodes])
  const currentNode = path[path.length - 1] ?? null
  const children = index.get(currentNode?.id ?? null) ?? []
  const currentFen = currentNode?.fen ?? START_FEN
  const parentId = path.length >= 2 ? path[path.length - 2].id : null
  const siblings = path.length === 0 ? (index.get(null) ?? []) : (index.get(parentId) ?? [])

  function attemptMove(from: string, to: string): boolean {
    const chess = new Chess(currentFen)
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

    const existing = children.find((n) => n.moveSan === move.san)
    if (existing) {
      setPath((p) => [...p, existing])
      return true
    }

    const node: RepertoireNode = {
      id: crypto.randomUUID(),
      color,
      parentId: currentNode?.id ?? null,
      ply: path.length + 1,
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
      setNodes(fresh)
      setPath((p) => p.slice(0, -1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex shrink-0 flex-col gap-3">
        <div className="w-full max-w-[480px] overflow-hidden rounded shadow-lg">
          <Chessboard
            options={{
              position: currentFen,
              boardOrientation: color,
              allowDragging: !deleting,
              onPieceDrop: handleDrop,
              onSquareClick: handleSquareClick,
              squareStyles: selectedSquare
                ? { [selectedSquare]: { boxShadow: 'inset 0 0 0 3px #eeeed2' } }
                : undefined,
              darkSquareStyle: { backgroundColor: '#769656' },
              lightSquareStyle: { backgroundColor: '#eeeed2' },
              darkSquareNotationStyle: { color: '#eeeed2' },
              lightSquareNotationStyle: { color: '#769656' },
            }}
          />
        </div>

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
          <button
            onClick={handleDelete}
            disabled={!currentNode || deleting}
            className="rounded-md border border-rose-900 px-2.5 py-1 text-rose-400 hover:bg-rose-950 disabled:opacity-40"
          >
            Delete this line
          </button>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        {siblings.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-500">Alternatives here:</span>
            {siblings.map((sibling) => (
              <button
                key={sibling.id}
                onClick={() => setPath((p) => [...p.slice(0, -1), sibling])}
                className={`rounded px-2 py-0.5 ${
                  sibling.id === currentNode?.id
                    ? 'bg-emerald-700/50 font-medium text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {sibling.moveSan}
              </button>
            ))}
          </div>
        )}

        <p className="max-w-[480px] text-sm text-zinc-500">
          Drag, or click a piece then a destination, to record your prep. Playing a move
          that&rsquo;s already in the tree just navigates into it; a new move adds a branch.
          Multiple branches from the same position are fine — that&rsquo;s how you prepare for more
          than one opponent try.
        </p>
      </div>

      <RepertoireTree nodes={nodes} currentPath={path} onSelectPath={setPath} />
    </div>
  )
}
