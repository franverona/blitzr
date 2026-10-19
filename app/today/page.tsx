import { cookies } from 'next/headers'
import Link from 'next/link'
import { getTodaySummary } from '../actions'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { MiniBoard } from '@/components/MiniBoard'
import { getStrings } from '@/lib/i18n/strings'
import { getMateProblem, puzzleColorToMove } from '@/lib/mateProblems'
import { getTrainingOrientation, resolveOrientation } from '@/lib/theme'

const linkClassName =
  'self-start rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800'

export default async function TodayPage() {
  const s = getStrings()
  const { dueCards, unanalyzedGames, accuracy, nextPuzzleId } = await getTodaySummary()
  const puzzle = nextPuzzleId === null ? undefined : getMateProblem(nextPuzzleId)
  const orientation = getTrainingOrientation(
    (await cookies()).get('blitzr-training-orientation')?.value,
  )
  const delta =
    accuracy.recent !== null && accuracy.overall !== null
      ? Math.round((accuracy.recent - accuracy.overall) * 10) / 10
      : null

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">{s.today.title}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title={s.today.drillTitle}>
          <p className="text-3xl font-semibold">{dueCards}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.today.cardsDue(dueCards)}</p>
          {dueCards > 0 && (
            <Link href="/drill" className={linkClassName}>
              {s.today.startDrill}
            </Link>
          )}
        </Card>

        <Card title={s.today.analysisTitle}>
          <p className="text-3xl font-semibold">{unanalyzedGames}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {s.today.unanalyzed(unanalyzedGames)}
          </p>
          {unanalyzedGames > 0 && <BulkAnalyzeButton hasUnanalyzedGames />}
        </Card>

        <Card title={s.today.accuracyTitle}>
          {accuracy.recent === null ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.today.noRecentGames}</p>
          ) : (
            <>
              <p className="text-3xl font-semibold">
                {accuracy.recent}%
                {delta !== null && (
                  <span
                    className={`ml-2 text-base font-medium ${
                      delta >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {delta >= 0 ? '+' : ''}
                    {delta}
                  </span>
                )}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {s.today.accuracyVsAverage(accuracy.recentGames, accuracy.overall ?? 0)}
              </p>
            </>
          )}
          <Link href="/blunders" className={linkClassName}>
            {s.today.seeBlunders}
          </Link>
        </Card>

        <Card title={s.today.puzzleTitle}>
          {puzzle ? (
            <Link
              href={`/puzzles/${puzzle.id}`}
              className="flex items-center gap-3 hover:underline"
            >
              <div className="w-28 shrink-0">
                <MiniBoard
                  fen={puzzle.fen}
                  boardOrientation={resolveOrientation(orientation, puzzleColorToMove(puzzle))}
                />
              </div>
              <span className="text-sm">{s.today.puzzleLabel(puzzle.id, puzzle.mateIn)}</span>
            </Link>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.today.allPuzzlesSolved}</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  )
}
