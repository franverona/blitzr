import Link from 'next/link'
import { getSolvedPuzzleIds } from '../actions'
import { MiniBoard } from '@/components/MiniBoard'
import {
  PuzzleFilters,
  type PuzzleColorFilter,
  type PuzzleStatusFilter,
} from '@/components/PuzzleFilters'
import { getStrings } from '@/lib/i18n/strings'
import { MATE_PROBLEMS, puzzleColorToMove } from '@/lib/mateProblems'

// Each card mounts a live MiniBoard (react-chessboard instance, not a static
// image) — with 200+ puzzles, rendering all of them unpaginated triggered a
// real "Maximum update depth exceeded" React error (reproduced: gone once
// the visible count drops to a handful, e.g. the "solved" filter with just
// one match). Paginated, same convention as the games list (app/page.tsx),
// keeps the live count per page in the range that's actually worked fine
// elsewhere (the /learn grid, ~15-19 MiniBoards at once).
const PAGE_SIZE = 20

type PuzzlesSearchParams = {
  page?: string
  status?: string
  color?: string
  mateIn?: string
}

export default async function PuzzlesPage({
  searchParams,
}: {
  searchParams: Promise<PuzzlesSearchParams>
}) {
  const {
    page: pageParam,
    status: statusParam,
    color: colorParam,
    mateIn: mateInParam,
  } = await searchParams
  const s = getStrings()

  const page = Math.max(1, Number(pageParam) || 1)
  const status: PuzzleStatusFilter =
    statusParam === 'solved' || statusParam === 'unsolved' ? statusParam : 'all'
  const color: PuzzleColorFilter =
    colorParam === 'white' || colorParam === 'black' ? colorParam : 'all'
  const mateIn = mateInParam ? Number(mateInParam) : undefined

  const solvedIds = new Set(await getSolvedPuzzleIds())
  const availableMateIns = [...new Set(MATE_PROBLEMS.map((p) => p.mateIn))].sort((a, b) => a - b)

  const filtered = MATE_PROBLEMS.filter((problem) => {
    if (status === 'solved' && !solvedIds.has(problem.id)) return false
    if (status === 'unsolved' && solvedIds.has(problem.id)) return false
    if (color !== 'all' && puzzleColorToMove(problem) !== color) return false
    if (mateIn !== undefined && problem.mateIn !== mateIn) return false
    return true
  })
  // Ignores the status filter itself (there's nothing to jump to from a
  // "solved" view) but still honors color/mateIn, so the shortcut respects
  // what the user is actually practicing right now.
  const nextUnsolved = MATE_PROBLEMS.find((problem) => {
    if (solvedIds.has(problem.id)) return false
    if (color !== 'all' && puzzleColorToMove(problem) !== color) return false
    if (mateIn !== undefined && problem.mateIn !== mateIn) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageFilters = { status: statusParam, color: colorParam, mateIn: mateInParam }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{s.puzzlesPage.title}</h1>
          {MATE_PROBLEMS.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width]"
                    style={{ width: `${(solvedIds.size / MATE_PROBLEMS.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {s.puzzlesPage.solvedCount(solvedIds.size, MATE_PROBLEMS.length)}
                </span>
              </div>
              {nextUnsolved && (
                <Link
                  href={`/puzzles/${nextUnsolved.id}`}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {s.puzzlesPage.nextUnsolved}
                </Link>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.puzzlesPage.intro}</p>
      </div>

      {MATE_PROBLEMS.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.puzzlesPage.empty}</p>
      ) : (
        <>
          <PuzzleFilters
            status={status}
            color={color}
            mateIn={mateIn}
            availableMateIns={availableMateIns}
          />

          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.puzzlesPage.noneMatch}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {pageItems.map((problem) => {
                const isSolved = solvedIds.has(problem.id)
                return (
                  <Link
                    key={problem.id}
                    href={`/puzzles/${problem.id}`}
                    className={`flex flex-col gap-1 rounded-lg border p-3 hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                      isSolved
                        ? 'border-emerald-300 dark:border-emerald-800'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <MiniBoard fen={problem.fen} boardOrientation={puzzleColorToMove(problem)} />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">#{problem.id}</p>
                      <div className="flex items-center gap-1">
                        {isSolved && (
                          <span
                            title={s.puzzles.solvedBadge}
                            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                          >
                            ✓
                          </span>
                        )}
                        <span className="bg-accent/20 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
                          {s.puzzles.mateIn(problem.mateIn)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{problem.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {[problem.source, problem.year].filter(Boolean).join(', ')}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <PageLink page={page - 1} filters={pageFilters} disabled={page <= 1}>
                {s.puzzlesPage.pagePrevious}
              </PageLink>
              <span className="text-zinc-500 dark:text-zinc-400">
                {s.puzzlesPage.pageOf(page, totalPages)}
              </span>
              <PageLink page={page + 1} filters={pageFilters} disabled={page >= totalPages}>
                {s.puzzlesPage.pageNext}
              </PageLink>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PageLink({
  page,
  filters,
  disabled,
  children,
}: {
  page: number
  filters: Omit<PuzzlesSearchParams, 'page'>
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return <span className="text-zinc-300 dark:text-zinc-700">{children}</span>
  }
  const params = new URLSearchParams({ page: String(page) })
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return (
    <Link href={`/puzzles?${params}`} className="hover:underline">
      {children}
    </Link>
  )
}
