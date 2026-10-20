import type { ComponentProps } from 'react'

export function ErrorText({ className = 'text-sm', ...props }: ComponentProps<'p'>) {
  return <p role="alert" {...props} className={`text-rose-600 dark:text-rose-400 ${className}`} />
}
