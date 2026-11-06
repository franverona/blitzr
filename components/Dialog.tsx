'use client'

import { useId, type ComponentProps, type ReactNode } from 'react'
import { getStrings } from '@/lib/i18n/strings'

/**
 * Modal shell: centered (or a full-height panel on the right), closes on a backdrop click or ✕,
 * and is named by its `<h2>`.
 * The caller owns `ref` and calls `showModal()`. With `onSubmit`, the body is a `<form>`.
 */
export function Dialog({
  title,
  titleClassName = 'text-sm',
  className = 'max-w-sm',
  bodyClassName = 'gap-3 p-5',
  placement = 'center',
  onSubmit,
  children,
  ...props
}: Omit<ComponentProps<'dialog'>, 'title' | 'onSubmit'> & {
  title: ReactNode
  placement?: 'center' | 'right'
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
      className={`fixed m-0 border-zinc-200 bg-zinc-50 p-0 text-left text-zinc-900 backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${
        placement === 'right'
          ? // Slides in and out: `starting:` is where it enters from, and the discrete transition
            // keeps it displayed until it has slid out.
            'top-0 right-0 left-auto h-dvh max-h-none max-w-full translate-x-full border-l transition-[translate,display,overlay] transition-discrete duration-200 ease-out backdrop:opacity-0 backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete backdrop:duration-200 open:translate-x-0 open:backdrop:opacity-100 motion-reduce:transition-none motion-reduce:backdrop:transition-none starting:open:translate-x-full starting:open:backdrop:opacity-0'
          : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border'
      } ${className}`}
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
