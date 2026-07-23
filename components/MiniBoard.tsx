'use client'

import { Chessboard } from 'react-chessboard'

/** A small, non-interactive board snapshot of a single position — used as a
 *  visual preview on the /learn index cards (the lesson's resulting
 *  position), not for stepping through moves. */
export function MiniBoard({ fen }: { fen: string }) {
  return (
    <div className="aspect-square w-full overflow-hidden rounded">
      <Chessboard
        options={{
          position: fen,
          allowDragging: false,
          showNotation: false,
          darkSquareStyle: { backgroundColor: '#769656' },
          lightSquareStyle: { backgroundColor: '#eeeed2' },
        }}
      />
    </div>
  )
}
