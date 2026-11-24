import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSolvedPuzzleIds } from '@/app/actions'
import { PuzzleBoard } from '@/components/PuzzleBoard'
import { getStrings } from '@/lib/i18n/strings'
import { puzzleKindLabel } from '@/lib/mateProblems'
import { allMateProblems, getMateProblem } from '@/lib/puzzleSet'
import { Badge } from '@/components/Badge'
import { LINK_CLASS } from '@/components/styles'

export default async function PuzzlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const problem = getMateProblem(Number(id))
  if (!problem) notFound()

  const s = getStrings()
  const solved = (await getSolvedPuzzleIds()).includes(problem.id)
  const problems = allMateProblems()
  const index = problems.findIndex((p) => p.id === problem.id)
  const previous = index > 0 ? problems[index - 1] : null
  const next = index < problems.length - 1 ? problems[index + 1] : null

  const header = (
    <div className="flex flex-col gap-1">
      <Link
        href="/puzzles"
        className="w-fit text-xs text-zinc-600 hover:underline dark:text-zinc-400"
      >
        {s.puzzlesPage.backToList}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold">
          #{problem.id} {problem.title}
        </h1>
        <Badge tone={problem.saves ? 'amber' : 'accent'} shape="tag">
          {puzzleKindLabel(problem)}
        </Badge>
        {solved && (
          <Badge tone="emerald" shape="tag">
            ✓ {s.puzzles.solvedBadge}
          </Badge>
        )}
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {[
          problem.composer,
          problem.source,
          problem.year,
          problem.rating && s.puzzles.rating(problem.rating),
        ]
          .filter(Boolean)
          .join(' · ')}
        {problem.url && (
          <>
            {' · '}
            <a href={problem.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {s.puzzles.viewOnLichess}
            </a>
          </>
        )}
      </p>
    </div>
  )

  return (
    <PuzzleBoard
      key={problem.id}
      problem={problem}
      header={header}
      previousId={previous?.id ?? null}
      nextId={next?.id ?? null}
    />
  )
}
