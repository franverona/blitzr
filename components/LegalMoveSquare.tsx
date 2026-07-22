// react-chessboard's squareRenderer takes over a square's background
// entirely (the library only auto-applies squareStyles when squareRenderer
// is absent) — so the selected-square highlight lives here too, not in a
// separate squareStyles prop.
export function LegalMoveSquare({
  children,
  isSelected,
  isLegalMove,
  isCapture,
}: {
  children?: React.ReactNode
  isSelected: boolean
  isLegalMove: boolean
  isCapture: boolean
}) {
  return (
    <div className={`relative h-full w-full ${isSelected ? 'bg-yellow-300/40' : ''}`}>
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
