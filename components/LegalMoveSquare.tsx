// squareRenderer replaces squareStyles entirely, so selection is drawn here too.
export function LegalMoveSquare({
  children,
  isSelected,
  isLegalMove,
  isCapture,
  isHintOrigin,
}: {
  children?: React.ReactNode
  isSelected: boolean
  isLegalMove: boolean
  isCapture: boolean
  /** Drill hint level 2: the piece to move. */
  isHintOrigin?: boolean
}) {
  return (
    <div
      className={`relative h-full w-full ${isSelected ? 'bg-yellow-300/40' : isHintOrigin ? 'bg-sky-400/40' : ''}`}
    >
      {children}
      {isLegalMove && !isCapture && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/25" />
      )}
      {isCapture && (
        <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_4px_rgba(0,0,0,0.25)]" />
      )}
    </div>
  )
}
