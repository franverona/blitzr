import type { ComponentProps, ReactNode } from 'react'

export function SectionLabel({ className = '', ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      {...props}
      className={`text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400 ${className}`}
    />
  )
}

/** Elevated surface, optionally headed by a `SectionLabel`. */
export function Card({
  title,
  className = '',
  children,
}: {
  title?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {title && <SectionLabel>{title}</SectionLabel>}
      {children}
    </section>
  )
}
