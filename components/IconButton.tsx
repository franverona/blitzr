import type { ComponentProps } from 'react'

/** Small round button for a glyph ("?", "⇅"); always give it an `aria-label`. */
export function IconButton({ className = '', ...props }: ComponentProps<'button'>) {
  return (
    <button
      {...props}
      className={`flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
    />
  )
}
