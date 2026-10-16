'use client'

import { Chessboard } from 'react-chessboard'
import { useSettings } from './SettingsProvider'

/** Small non-interactive board for a single position. */
export function MiniBoard({
  fen,
  boardOrientation = 'white',
}: {
  fen: string
  boardOrientation?: 'white' | 'black'
}) {
  const boardColors = useSettings()
  return (
    <div className="aspect-square w-full overflow-hidden rounded">
      <Chessboard
        options={{
          position: fen,
          boardOrientation,
          allowDragging: false,
          showNotation: false,
          darkSquareStyle: { backgroundColor: boardColors.dark },
          lightSquareStyle: { backgroundColor: boardColors.light },
        }}
      />
    </div>
  )
}
