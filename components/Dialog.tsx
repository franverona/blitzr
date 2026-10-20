'use client'

import { useId, type ComponentProps, type ReactNode } from 'react'
import { getStrings } from '@/lib/i18n/strings'

/**
 * Modal shell: centered, closes on a backdrop click or ✕, and is named by its `<h2>`.
 * The caller owns `ref` and calls `showModal()`. With `onSubmit`, the body is a `<form>`.
 */
export function Dialog({
  title,
  titleClassName = 'text-sm',
  className = 'max-w-sm',
  bodyClassName = 'gap-3 p-5',
  onSubmit,
  children,
  ...props
}: Omit<ComponentProps<'dialog'>, 'title' | 'onSubmit'> & {
  title: ReactNode
  titleClassName?: string
  bodyClassName?: string
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  const titleId = useId()
  const s = getStrings()
  const bodyClass = `flex flex-col ${bodyClassName}`
  const content = (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className={`font-semibold ${titleClassName}`}>
          {title}
        </h2>
        <button
          type="button"
          onClick={(e) => e.currentTarget.closest('dialog')?.close()}
          aria-label={s.common.close}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ✕
        </button>
      </div>
      {children}
    </>
  )

  return (
    <dialog
      {...props}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
      className={`fixed top-1/2 left-1/2 m-0 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-200 bg-zinc-50 p-0 text-left text-zinc-900 backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${className}`}
    >
      {onSubmit ? (
        <form onSubmit={onSubmit} className={bodyClass}>
          {content}
        </form>
      ) : (
        <div className={bodyClass}>{content}</div>
      )}
    </dialog>
  )
}
