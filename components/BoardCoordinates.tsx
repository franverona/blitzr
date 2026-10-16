const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

/** Rank/file labels in a gutter outside the board (instead of
 *  react-chessboard's `showNotation`). A sibling stretched alongside, like
 *  `EvalBar`, needs `mb-7` when `show` is on. */
export function BoardCoordinates({
  show,
  orientation = 'white',
  className = '',
  children,
}: {
  show: boolean
  orientation?: 'white' | 'black'
  className?: string
  children: React.ReactNode
}) {
  if (!show) return <div className={className}>{children}</div>

  const files = orientation === 'white' ? FILES : [...FILES].reverse()
  const ranks = orientation === 'white' ? RANKS : [...RANKS].reverse()
  const labelClass = 'flex flex-1 items-center justify-center'

  return (
    <div
      className={`pb-7 pl-7 text-sm font-semibold text-zinc-500 select-none dark:text-zinc-400 ${className}`}
    >
      <div className="relative">
        {children}
        <div aria-hidden className="absolute inset-y-0 right-full flex w-7 flex-col">
          {ranks.map((rank) => (
            <span key={rank} className={labelClass}>
              {rank}
            </span>
          ))}
        </div>
        <div aria-hidden className="absolute inset-x-0 top-full flex h-7">
          {files.map((file) => (
            <span key={file} className={labelClass}>
              {file}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
