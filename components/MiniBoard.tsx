'use client'

import { Chessboard } from 'react-chessboard'
import { BOARD_DARK_SQUARE, BOARD_LIGHT_SQUARE } from '@/lib/theme'

/** A small, non-interactive board snapshot of a single position — used as a
 *  visual preview on the /learn index cards (the lesson's resulting
 *  position) and for a suggested move's follow-up plan, not for stepping
 *  through moves. `boardOrientation` defaults to White so the /learn index
 *  cards (which never pass it) keep their existing look. */
export function MiniBoard({
  fen,
  boardOrientation = 'white',
}: {
  fen: string
  boardOrientation?: 'white' | 'black'
}) {
  return (
    <div className="aspect-square w-full overflow-hidden rounded">
      <Chessboard
        options={{
          position: fen,
          boardOrientation,
          allowDragging: false,
          showNotation: false,
          darkSquareStyle: { backgroundColor: BOARD_DARK_SQUARE },
          lightSquareStyle: { backgroundColor: BOARD_LIGHT_SQUARE },
        }}
      />
    </div>
  )
}
