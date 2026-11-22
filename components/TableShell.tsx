import type { ReactNode } from 'react'

/** Bordered, horizontally scrollable table. `head` is the header row's `<th>`s,
 *  `children` the body's `<tr>`s. */
export function TableShell({
  head,
  headClassName = 'bg-zinc-100 dark:bg-zinc-900',
  stickyHead = false,
  children,
}: {
  head: ReactNode
  /** Background only; inside a dialog it needs to contrast with the dialog's. */
  headClassName?: string
  /** Header sticks to the top of `<main>` as it scrolls, at lg+ only: sticky needs the wrapper not
   *  to be a scroll container, so narrower screens keep horizontal scrolling instead. */
  stickyHead?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`overflow-x-auto ${stickyHead ? 'lg:overflow-x-visible' : ''} rounded-lg border border-zinc-300 bg-white shadow-sm dark:border-zinc-800 dark:bg-transparent dark:shadow-none`}
    >
      <table className="w-full text-sm">
        <thead
          className={`text-left text-xs tracking-wide text-zinc-600 uppercase dark:text-zinc-400 ${headClassName} ${
            // Unclipped, the head's square corners would show past the rounded border.
            stickyHead
              ? 'sticky top-0 z-10 [&_th:first-child]:rounded-tl-lg [&_th:last-child]:rounded-tr-lg'
              : ''
          }`}
        >
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{children}</tbody>
      </table>
    </div>
  )
}
