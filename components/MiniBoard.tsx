'use client'

import { Chessboard } from 'react-chessboard'
import { BOARD_DARK_SQUARE, BOARD_LIGHT_SQUARE } from '@/lib/theme'

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
          darkSquareStyle: { backgroundColor: BOARD_DARK_SQUARE },
          lightSquareStyle: { backgroundColor: BOARD_LIGHT_SQUARE },
        }}
      />
    </div>
  )
}
