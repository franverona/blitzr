import Link from 'next/link'
import { getSolvedPuzzleIds } from '../actions'
import {
  PuzzleFilters,
  type PuzzleColorFilter,
  type PuzzleStatusFilter,
} from '@/components/PuzzleFilters'
import { getStrings } from '@/lib/i18n/strings'
import { MATE_PROBLEMS, puzzleColorToMove } from '@/lib/mateProblems'

type PuzzlesSearchParams = {
  status?: string
  color?: string
  mateIn?: string
}

export default async function PuzzlesPage({
  searchParams,
}: {
  searchParams: Promise<PuzzlesSearchParams>
}) {
  const { status: statusParam, color: colorParam, mateIn: mateInParam } = await searchParams
  const s = getStrings()

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">{s.puzzlesPage.title}</h1>
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
              {filtered.map((problem) => {
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
                    <div className="flex items-center justify-between gap-2">
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
        </>
      )}
    </div>
  )
}
