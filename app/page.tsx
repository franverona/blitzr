import { cookies } from 'next/headers'
import Link from 'next/link'
import { getTodaySummary } from './actions'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { MiniBoard } from '@/components/MiniBoard'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { getMateProblem, puzzleColorToMove } from '@/lib/mateProblems'
import { getTrainingOrientation, resolveOrientation } from '@/lib/theme'

const linkClassName =
  'self-start rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800'
const mutedClassName = 'text-sm text-zinc-500 dark:text-zinc-400'
const inlineLinkClassName = 'text-blue-600 hover:underline dark:text-blue-400'

export default async function TodayPage() {
  const s = getStrings()
  const today = await getTodaySummary()
  const { drill, accuracy, results, weakSpot, lastGame, repertoire, puzzles } = today
  const puzzle = puzzles.nextId === null ? undefined : getMateProblem(puzzles.nextId)
  const orientation = getTrainingOrientation(
    (await cookies()).get('blitzr-training-orientation')?.value,
  )
  const delta =
    accuracy.recent !== null && accuracy.overall !== null
      ? Math.round((accuracy.recent - accuracy.overall) * 10) / 10
      : null
  const playedRecently = results.wins + results.losses + results.draws > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">{s.today.title}</h1>
        {today.lastSyncedAt && (
          <p className={mutedClassName}>{s.today.lastSynced(timeAgo(today.lastSyncedAt))}</p>
        )}
      </div>

      {!today.hasGames && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {s.today.noGames}{' '}
          <Link href="/games" className={inlineLinkClassName}>
            {s.today.goToGames}
          </Link>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card title={s.today.drillTitle}>
          <p className="text-3xl font-semibold">{Math.min(drill.due, drill.sessionSize)}</p>
          <p className={mutedClassName}>
            {s.today.sessionCards(Math.min(drill.due, drill.sessionSize))}
          </p>
          {drill.due > 0 && (
            <p className={mutedClassName}>
              {s.today.dueBreakdown(drill.due, drill.dueDeviations, drill.dueBlunders)}
            </p>
          )}
          {drill.streak > 0 && <p className="text-sm">{s.today.streak(drill.streak)}</p>}
          {drill.due > 0 && (
            <Link href="/drill" className={linkClassName}>
              {s.today.startDrill}
            </Link>
          )}
        </Card>

        <Card title={s.today.analysisTitle}>
          <p className="text-3xl font-semibold">{today.unanalyzedGames}</p>
          <p className={mutedClassName}>{s.today.unanalyzed(today.unanalyzedGames)}</p>
          {today.unanalyzedGames > 0 && <BulkAnalyzeButton hasUnanalyzedGames />}
        </Card>

        <Card title={s.today.accuracyTitle}>
          {accuracy.recent === null ? (
            <p className={mutedClassName}>{s.today.noRecentGames}</p>
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
              <p className={mutedClassName}>
                {s.today.accuracyVsAverage(accuracy.recentGames, accuracy.overall ?? 0)}
              </p>
            </>
          )}
          {playedRecently && (
            <p className="text-sm">{s.today.record(results.wins, results.losses, results.draws)}</p>
          )}
          {results.ratings.map((r) => (
            <p key={r.timeClass} className="text-sm">
              {s.common.timeClass[r.timeClass as keyof typeof s.common.timeClass] ?? r.timeClass}{' '}
              {r.rating}{' '}
              <span
                className={
                  r.change >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                ({r.change >= 0 ? '+' : ''}
                {r.change})
              </span>
            </p>
          ))}
        </Card>

        <Card title={s.today.focusTitle}>
          {weakSpot ? (
            <p className="text-sm">
              {s.today.weakSpot(weakSpot.opening, weakSpot.blunders)}{' '}
              <Link
                href={
                  weakSpot.drillable
                    ? `/drill?opening=${encodeURIComponent(weakSpot.opening)}`
                    : '/blunders'
                }
                className={inlineLinkClassName}
              >
                {weakSpot.drillable ? s.today.drillOpening : s.today.seeBlunders}
              </Link>
            </p>
          ) : (
            <p className={mutedClassName}>{s.today.noWeakSpot}</p>
          )}
          {repertoire.considered > 0 ? (
            <p className="text-sm">
              {s.today.repertoireDeviations(repertoire.deviated, repertoire.considered)}
            </p>
          ) : (
            <p className={mutedClassName}>
              {s.today.noRepertoire}{' '}
              <Link href="/repertoire" className={inlineLinkClassName}>
                {s.today.buildRepertoire}
              </Link>
            </p>
          )}
        </Card>

        <Card title={s.today.lastGameTitle}>
          {lastGame ? (
            <div className="flex items-center gap-3">
              <Link href={`/games/${lastGame.id}`} className="w-28 shrink-0">
                <MiniBoard fen={lastGame.fen} boardOrientation={lastGame.myColor} />
              </Link>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm">
                  <Link href={`/games/${lastGame.id}`} className={inlineLinkClassName}>
                    {s.today.lastGameVs(lastGame.opponent)}
                  </Link>{' '}
                  · {s.common.result[lastGame.result]}
                </p>
                {lastGame.accuracy === null ? (
                  <p className={mutedClassName}>{s.today.notAnalyzed}</p>
                ) : (
                  <>
                    <p className="text-sm">{s.today.lastGameAccuracy(lastGame.accuracy)}</p>
                    <p className="text-sm">
                      {lastGame.firstBlunderPly === null
                        ? s.today.noBlunders
                        : s.today.firstBlunder(Math.ceil(lastGame.firstBlunderPly / 2))}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className={mutedClassName}>{s.today.noLastGame}</p>
          )}
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
            <p className={mutedClassName}>{s.today.allPuzzlesSolved}</p>
          )}
          <p className={mutedClassName}>
            {s.puzzlesPage.solvedCount(puzzles.solved, puzzles.total)}
          </p>
        </Card>
      </div>
    </div>
  )
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60000)
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
  if (Math.abs(minutes) < 60 * 24) return format.format(Math.round(minutes / 60), 'hour')
  return format.format(Math.round(minutes / (60 * 24)), 'day')
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
