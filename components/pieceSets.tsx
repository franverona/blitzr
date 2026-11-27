'use client'

import { useState } from 'react'
import { defaultPieces, type PieceRenderObject } from 'react-chessboard'
import { type PieceSet, pieceImageUrl } from '@/lib/theme'

// Cached so each set keeps stable renderers: react-chessboard renders each as a component, so a
// new function per render would remount every piece.
const cache = new Map<PieceSet, PieceRenderObject>()

/** Renderers for react-chessboard's `pieces` option; `undefined` keeps its built-in set. */
export function piecesFor(set: PieceSet): PieceRenderObject | undefined {
  if (set === 'default') return undefined
  let pieces = cache.get(set)
  if (!pieces) {
    pieces = Object.fromEntries(
      Object.keys(defaultPieces).map((piece) => [
        piece,
        function HotlinkedPiece() {
          return <PieceImage set={set} piece={piece} />
        },
      ]),
    )
    cache.set(set, pieces)
  }
  return pieces
}

// Hotlinked from Lichess, so offline (or with Lichess down) a piece falls back to the built-in one.
function PieceImage({ set, piece }: { set: Exclude<PieceSet, 'default'>; piece: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    const Fallback = defaultPieces[piece]
    return <Fallback />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a hotlinked SVG; next/image adds nothing
    <img
      src={pieceImageUrl(set, piece)}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      // A server-rendered image can fail before hydration attaches onError.
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true)
      }}
      className="block h-full w-full select-none"
    />
  )
}
