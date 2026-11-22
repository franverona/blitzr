'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { deletePracticeGames } from '@/app/actions'
import type { GameSort, SortDir } from '@/lib/gameSort'
import { getStrings } from '@/lib/i18n/strings'
import type { Game, GameAccuracy } from '@/lib/types'
import { GameRow } from './GameRow'
import { buttonClass } from './styles'
import { TableShell } from './TableShell'

const TOAST_ID = 'delete-practice'

export function GameList({
  games,
  accuracyByGameId,
  filtered,
  selectable = false,
  emptyText,
  headClassName,
  sort,
  stickyHead,
}: {
  /** Sortable headers: the active sort, and where clicking each column's header goes. */
  sort?: { sort: GameSort; dir: SortDir; hrefs: Record<GameSort, string> }
  games: Game[]
  /** Any filter is active, so an empty list means "no matches", not "no games". */
  filtered: boolean
  /** Own-side accuracy per analyzed game. */
  accuracyByGameId: Record<string, GameAccuracy>
  /** Checkboxes and "Delete selected": only practice games are deletable in bulk. */
  selectable?: boolean
  emptyText?: string
  /** Passed to `TableShell`, for a list inside a dialog. */
  headClassName?: string
  stickyHead?: boolean
}) {
  const s = getStrings()
  const router = useRouter()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  // Only ids still on this page count, so a deleted or paged-away game drops out on its own.
  const selected = games.filter((g) => picked.has(g.id)).map((g) => g.id)
  const allSelected = games.length > 0 && selected.length === games.length
  const selecting = selected.length > 0

  if (games.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {emptyText ?? (filtered ? s.gameList.noMatches : s.gameList.empty)}
      </p>
    )
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Plain text while selecting, since the labels are hidden then.
  function header(key: keyof typeof s.gameList.headers) {
    const label = s.gameList.headers[key]
    if (!sort || selecting || !(key in sort.hrefs)) return label
    const active = sort.sort === key
    return (
      <Link
        href={sort.hrefs[key as GameSort]}
        prefetch={false}
        className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {label}
        {active && <span aria-hidden>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
      </Link>
    )
  }

  function ariaSort(key: string) {
    if (sort?.sort !== key) return undefined
    return sort.dir === 'asc' ? 'ascending' : 'descending'
  }

  function handleDelete() {
    if (!window.confirm(s.gameList.deleteSelectedConfirm(selected.length))) return
    startTransition(async () => {
      const deleted = await deletePracticeGames(selected)
      setPicked(new Set())
      toast(s.gameList.deleted(deleted), { id: TOAST_ID })
      router.refresh()
    })
  }

  return (
    <TableShell
      headClassName={headClassName}
      stickyHead={stickyHead}
      head={
        <>
          {selectable && (
            <th className="w-8 px-3 py-2">
              <input
                type="checkbox"
                // block: centered by the cell, not sat on the text baseline.
                className="block"
                aria-label={s.gameList.selectAll}
                checked={allSelected}
                onChange={() => setPicked(new Set(allSelected ? [] : games.map((g) => g.id)))}
              />
            </th>
          )}
          {/* The practice list (the selectable one) has no star column. */}
          {!selectable && (
            <th className="w-9 py-2 pl-2">
              <span className="sr-only">{s.gameList.headers.favorite}</span>
            </th>
          )}
          {/* With a selection, the labels turn transparent (keeping the column widths) and the
              button sits over them, so neither the table nor its columns move. */}
          <th
            aria-sort={ariaSort('date')}
            className={`relative px-3 py-2 ${selecting ? 'text-transparent' : ''}`}
          >
            {header('date')}
            {selecting && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className={`absolute top-1/2 left-3 -translate-y-1/2 whitespace-nowrap normal-case ${buttonClass({ variant: 'danger', size: 'xs' })}`}
              >
                {s.gameList.deleteSelected(selected.length)}
              </button>
            )}
          </th>
          {(
            [
              ['color', ''],
              ['site', ''],
              ['opponent', ''],
              ['result', ''],
              ['rating', 'text-right'],
              ['accuracy', 'text-center'],
              ['errors', 'text-center'],
              ['timeClass', ''],
            ] as const
          ).map(([key, align]) => (
            <th
              key={key}
              aria-sort={ariaSort(key)}
              className={`px-3 py-2 ${align} ${selecting ? 'text-transparent' : ''}`}
            >
              {header(key)}
            </th>
          ))}
        </>
      }
    >
      {games.map((game) => (
        <GameRow
          key={game.id}
          game={game}
          accuracy={accuracyByGameId[game.id]}
          select={
            selectable
              ? { checked: picked.has(game.id), onToggle: () => toggle(game.id) }
              : undefined
          }
        />
      ))}
    </TableShell>
  )
}
