import { cookies } from 'next/headers'
import Link from 'next/link'
import { getTodaySummary } from './actions'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { MiniBoard } from '@/components/MiniBoard'
import { FlameIcon, RefreshCwIcon } from '@/components/NavIcons'
import { formatDateTime } from '@/lib/dates'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { getMateProblem, puzzleColorToMove } from '@/lib/mateProblems'
import { plyLabel } from '@/lib/san'
import { getTrainingOrientation, resolveOrientation } from '@/lib/theme'
import type { MyResult } from '@/lib/types'

const linkClassName =
  'self-start rounded-md border border-zinc-300 px-2.5 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800'
const mutedClassName = 'text-sm text-zinc-500 dark:text-zinc-400'
const inlineLinkClassName = 'text-blue-600 hover:underline dark:text-blue-400'
const RESULT_BADGE_CLASS: Record<MyResult, string> = {
  win: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  loss: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  draw: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}

export default async function TodayPage() {
  const s = getStrings()
  const today = await getTodaySummary()
  const { drill, accuracy, results, weakSpot, lastGame, repertoire, puzzles } = today
  const lossCount = today.losses.reduce((sum, l) => sum + l.count, 0)
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {today.unanalyzedGames > 0 && (
            <>
              <p className={mutedClassName}>{s.today.unanalyzed(today.unanalyzedGames)}</p>
              <BulkAnalyzeButton hasUnanalyzedGames />
            </>
          )}
          {today.lastSyncedAt && (
            <SyncBadge syncedAt={today.lastSyncedAt} fresh={today.syncIsFresh} />
          )}
        </div>
      </div>

      {!today.hasGames && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {s.today.noGames}{' '}
          <Link href="/games" className={inlineLinkClassName}>
            {s.today.goToGames}
          </Link>
        </p>
      )}

      {/* xl: text cards fill the left half in two rows; the board cards span both on the right. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <StreakBadge streak={drill.streak} week={drill.week} />
          {drill.due > 0 && (
            <Link href="/drill" className={linkClassName}>
              {s.today.startDrill}
            </Link>
          )}
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
            <p key={r.timeClass} className="flex items-center gap-1.5 text-sm">
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
              <Sparkline points={today.ratingHistory[r.timeClass] ?? []} up={r.change >= 0} />
            </p>
          ))}
        </Card>

        <Card title={s.today.lastGameTitle} className="xl:row-span-2">
          {lastGame ? (
            <div className="flex flex-col gap-2">
              <Link href={`/games/${lastGame.id}`} className="w-full max-w-xs">
                <MiniBoard fen={lastGame.fen} boardOrientation={lastGame.myColor} />
              </Link>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex min-w-0 items-center gap-2">
                  <Link
                    href={`/games/${lastGame.id}`}
                    className={`truncate text-sm font-medium ${inlineLinkClassName}`}
                  >
                    {s.today.lastGameVs(lastGame.opponent)}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${RESULT_BADGE_CLASS[lastGame.result]}`}
                  >
                    {s.common.result[lastGame.result]}
                  </span>
                </p>
                {lastGame.accuracy === null ? (
                  <p className={mutedClassName}>{s.today.notAnalyzed}</p>
                ) : (
                  <>
                    <p className="text-sm">{s.today.lastGameAccuracy(lastGame.accuracy)}</p>
                    <p className={mutedClassName}>
                      {lastGame.firstBlunderPly === null ? (
                        s.today.noBlunders
                      ) : (
                        <Link
                          href={`/games/${lastGame.id}?ply=${lastGame.firstBlunderPly - 1}`}
                          className="hover:underline"
                        >
                          {s.today.firstBlunder(Math.ceil(lastGame.firstBlunderPly / 2))}
                        </Link>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className={mutedClassName}>{s.today.noLastGame}</p>
          )}
        </Card>

        <Card title={s.today.puzzleTitle} className="xl:row-span-2">
          {puzzle ? (
            <Link href={`/puzzles/${puzzle.id}`} className="group flex min-w-0 flex-col gap-2">
              <div className="w-full max-w-xs">
                <MiniBoard
                  fen={puzzle.fen}
                  boardOrientation={resolveOrientation(orientation, puzzleColorToMove(puzzle))}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium group-hover:underline">{puzzle.title}</p>
                <p className={mutedClassName}>{s.today.puzzleLabel(puzzle.id, puzzle.mateIn)}</p>
              </div>
            </Link>
          ) : (
            <p className={mutedClassName}>{s.today.allPuzzlesSolved}</p>
          )}
          {puzzles.total > 0 && (
            // Same bar as the /puzzles header, stacked above its label.
            <div className="flex max-w-xs flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(puzzles.solved / puzzles.total) * 100}%` }}
                />
              </div>
              <span className={mutedClassName}>
                {s.puzzlesPage.solvedCount(puzzles.solved, puzzles.total)}
              </span>
            </div>
          )}
        </Card>

        <Card title={s.today.focusTitle} className="sm:col-span-2">
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
          {today.worstBlunder && (
            <p className="text-sm">
              {s.today.worstBlunder}{' '}
              <span className="font-semibold">
                {plyLabel(today.worstBlunder.ply)}
                {today.worstBlunder.moveSan}
              </span>{' '}
              <span className="text-zinc-500 dark:text-zinc-400">({today.worstBlunder.label})</span>
              : {today.worstBlunder.why}{' '}
              <Link
                // One ply back, so the board shows the position before the mistake.
                href={`/games/${today.worstBlunder.gameId}?ply=${today.worstBlunder.ply - 1}`}
                className={inlineLinkClassName}
              >
                {s.today.reviewIt}
              </Link>
            </p>
          )}
          {lossCount > 0 && (
            <p className="text-sm">
              {s.today.lossesHeading(lossCount)}{' '}
              {today.losses.map((l) => `${l.count} ${s.today.lossReasons[l.reason]}`).join(' · ')}
            </p>
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
          {today.lesson && (
            <p className="text-sm">
              {s.today.lessonSuggestion(today.lesson.name, today.lesson.games)}{' '}
              <Link href={`/learn/${today.lesson.slug}`} className={inlineLinkClassName}>
                {s.today.studyLesson}
              </Link>
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

/** Hand-rolled SVG (like AccuracyTrendChart), oldest to newest; nothing under 2 points. */
function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const s = getStrings()
  if (points.length < 2) return null
  const width = 64
  const height = 16
  const min = Math.min(...points)
  const range = Math.max(...points) - min || 1
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width
      const y = height - 1 - ((p - min) / range) * (height - 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={s.today.ratingTrend}
      className={up ? 'text-emerald-500' : 'text-rose-500'}
    >
      <title>{s.today.ratingTrend}</title>
      <polyline
        points={coords}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StreakBadge({ streak, week }: { streak: number; week: boolean[] }) {
  const s = getStrings()
  const drilledToday = week.at(-1) === true
  return (
    <div className="my-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span
        className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          streak === 0
            ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            : drilledToday
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
              : 'border border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300'
        }`}
      >
        <FlameIcon className="size-3.5 shrink-0" />
        {streak === 0 ? s.today.noStreak : s.today.streak(streak)}
      </span>
      {/* Last 7 days, today on the right. */}
      <span className="flex items-center gap-1" title={s.today.streakWeek}>
        {week.map((reviewed, i) => (
          <span
            key={i}
            className={`size-2 rounded-full ${
              reviewed ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-700'
            } ${i === week.length - 1 ? 'ring-1 ring-orange-500/60 ring-offset-1 ring-offset-zinc-50 dark:ring-offset-zinc-900' : ''}`}
          />
        ))}
      </span>
      {streak > 0 && !drilledToday && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{s.today.keepStreak}</span>
      )}
    </div>
  )
}

function SyncBadge({ syncedAt, fresh }: { syncedAt: string; fresh: boolean }) {
  const s = getStrings()
  return (
    <p
      title={formatDateTime(Date.parse(syncedAt) / 1000)}
      className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${fresh ? 'bg-emerald-500' : 'bg-amber-500'}`}
      />
      <RefreshCwIcon className="size-3.5 shrink-0" />
      {s.today.lastSynced(timeAgo(syncedAt))}
    </p>
  )
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60000)
  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
  if (Math.abs(minutes) < 60 * 24) return format.format(Math.round(minutes / 60), 'hour')
  return format.format(Math.round(minutes / (60 * 24)), 'day')
}

function Card({
  title,
  className = '',
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={`flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  )
}
