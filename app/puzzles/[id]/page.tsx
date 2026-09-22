import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PuzzleBoard } from '@/components/PuzzleBoard'
import { getStrings } from '@/lib/i18n/strings'
import { getMateProblem, MATE_PROBLEMS } from '@/lib/mateProblems'

export default async function PuzzlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const problem = getMateProblem(Number(id))
  if (!problem) notFound()

  const s = getStrings()
  const index = MATE_PROBLEMS.findIndex((p) => p.id === problem.id)
  const previous = index > 0 ? MATE_PROBLEMS[index - 1] : null
  const next = index < MATE_PROBLEMS.length - 1 ? MATE_PROBLEMS[index + 1] : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link
          href="/puzzles"
          className="w-fit text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {s.puzzlesPage.backToList}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">
            #{problem.id} {problem.title}
          </h1>
          <span className="bg-accent/20 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
            {s.puzzles.mateIn(problem.mateIn)}
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {[problem.composer, problem.source, problem.year].filter(Boolean).join(' · ')}
        </p>
      </div>

      <PuzzleBoard problem={problem} />

      <div className="mx-auto flex w-full max-w-140 items-center justify-between">
        {previous ? (
          <Link
            href={`/puzzles/${previous.id}`}
            className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            {s.puzzlesPage.previous}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/puzzles/${next.id}`}
            className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            {s.puzzlesPage.next}
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
