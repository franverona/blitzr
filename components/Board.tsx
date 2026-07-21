'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

export function Board({
  initialFen,
  movesSan,
  boardOrientation,
}: {
  initialFen: string
  movesSan: string[]
  boardOrientation: 'white' | 'black'
}) {
  const positions = useMemo(() => {
    const chess = new Chess(initialFen)
    const fens = [chess.fen()]
    for (const move of movesSan) {
      chess.move(move)
      fens.push(chess.fen())
    }
    return fens
  }, [initialFen, movesSan])

  const lastPly = positions.length - 1
  const [ply, setPly] = useState(lastPly)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex shrink-0 flex-col gap-3">
        <div className="w-full max-w-[560px] overflow-hidden rounded shadow-lg">
          <Chessboard
            options={{
              position: positions[ply],
              boardOrientation,
              allowDragging: false,
              darkSquareStyle: { backgroundColor: '#769656' },
              lightSquareStyle: { backgroundColor: '#eeeed2' },
              darkSquareNotationStyle: { color: '#eeeed2' },
              lightSquareNotationStyle: { color: '#769656' },
            }}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <NavButton onClick={() => setPly(0)} disabled={ply === 0} label="Start">
            ⏮
          </NavButton>
          <NavButton
            onClick={() => setPly((p) => Math.max(0, p - 1))}
            disabled={ply === 0}
            label="Previous move"
          >
            ◀
          </NavButton>
          <span className="min-w-16 text-center text-zinc-400 tabular-nums">
            {ply} / {lastPly}
          </span>
          <NavButton
            onClick={() => setPly((p) => Math.min(lastPly, p + 1))}
            disabled={ply === lastPly}
            label="Next move"
          >
            ▶
          </NavButton>
          <NavButton onClick={() => setPly(lastPly)} disabled={ply === lastPly} label="End">
            ⏭
          </NavButton>
        </div>
      </div>

      <MoveList movesSan={movesSan} ply={ply} onSelect={setPly} />
    </div>
  )
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md border border-zinc-700 px-2.5 py-1 hover:bg-zinc-800 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

interface MoveEntry {
  san: string
  ply: number
}

interface MovePair {
  moveNumber: number
  white?: MoveEntry
  black?: MoveEntry
}

function buildMovePairs(movesSan: string[]): MovePair[] {
  const pairs: MovePair[] = []
  movesSan.forEach((san, i) => {
    const ply = i + 1
    if (i % 2 === 0) {
      pairs.push({ moveNumber: Math.floor(i / 2) + 1, white: { san, ply } })
    } else {
      pairs[pairs.length - 1].black = { san, ply }
    }
  })
  return pairs
}

function MoveList({
  movesSan,
  ply,
  onSelect,
}: {
  movesSan: string[]
  ply: number
  onSelect: (ply: number) => void
}) {
  const pairs = useMemo(() => buildMovePairs(movesSan), [movesSan])
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [ply])

  return (
    <div className="flex w-full flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-900 lg:max-w-[280px]">
      <button
        ref={ply === 0 ? activeRef : undefined}
        onClick={() => onSelect(0)}
        className={`border-b border-zinc-800 px-3 py-1.5 text-left text-sm ${
          ply === 0
            ? 'bg-[#769656]/50 font-semibold text-white'
            : 'text-zinc-400 hover:bg-zinc-800/60'
        }`}
      >
        Starting position
      </button>
      <ol className="max-h-[480px] divide-y divide-zinc-800/60 overflow-y-auto text-sm">
        {pairs.map((pair) => (
          <li key={pair.moveNumber} className="flex">
            <span className="w-8 shrink-0 px-2 py-1.5 text-zinc-500 tabular-nums">
              {pair.moveNumber}.
            </span>
            {(['white', 'black'] as const).map((side) => {
              const move = pair[side]
              if (!move) {
                return <span key={side} className="flex-1 px-2 py-1.5" />
              }
              const isActive = move.ply === ply
              return (
                <button
                  key={side}
                  ref={isActive ? activeRef : undefined}
                  onClick={() => onSelect(move.ply)}
                  className={`flex-1 px-2 py-1.5 text-left ${
                    isActive
                      ? 'bg-[#769656]/50 font-semibold text-white'
                      : 'text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  {move.san}
                </button>
              )
            })}
          </li>
        ))}
      </ol>
    </div>
  )
}
