import type { ComponentProps } from 'react'

/** Native `<select>` with an overlaid chevron (the native arrow ignores
 *  padding and varies by browser). */
export function Select({ className = '', children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative inline-flex">
      <select
        {...props}
        className={`cursor-pointer appearance-none pr-7 disabled:cursor-default ${className}`}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-zinc-500"
      >
        <path
          d="M3 4.5 6 7.5 9 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
