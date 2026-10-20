import type { ReactNode } from 'react'

/** Bordered, horizontally scrollable table. `head` is the header row's `<th>`s,
 *  `children` the body's `<tr>`s. */
export function TableShell({
  head,
  headClassName = 'bg-zinc-100 dark:bg-zinc-900',
  children,
}: {
  head: ReactNode
  /** Background only; inside a dialog it needs to contrast with the dialog's. */
  headClassName?: string
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead
          className={`text-left text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400 ${headClassName}`}
        >
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{children}</tbody>
      </table>
    </div>
  )
}
