import type { ComponentProps } from 'react'

export function Spinner({ className = 'size-4', ...props }: ComponentProps<'span'>) {
  return (
    <span
      {...props}
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300 ${className}`}
    />
  )
}
