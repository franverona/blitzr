import { cookies } from 'next/headers'
import Link from 'next/link'
import { getTodaySummary } from './actions'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { MiniBoard } from '@/components/MiniBoard'
import { ResultBadge } from '@/components/ResultBadge'
import {
  FlagIcon,
  FlameIcon,
  GraduationCapIcon,
  LibraryBigIcon,
  RefreshCwIcon,
  TargetIcon,
  ZapIcon,
} from '@/components/NavIcons'
import { formatDateTime } from '@/lib/dates'
import { getLocale } from '@/lib/i18n/locale'
import { getStrings } from '@/lib/i18n/strings'
import { puzzleColorToMove, puzzleKindLabel } from '@/lib/mateProblems'
import { getMateProblem } from '@/lib/puzzleSet'
import { getTrainingOrientation, resolveOrientation } from '@/lib/theme'
import type { LossReason } from '@/lib/today'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import { buttonClass, LINK_CLASS, toneClass, type Tone } from '@/components/styles'

const mutedClassName = 'text-sm text-zinc-500 dark:text-zinc-400'
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
      <PageHeader
        title={s.today.title}
        actions={
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
        }
      />

      {!today.hasGames && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {/* Without a username, syncing can't work yet, so say how to set it first. */}
          {today.hasUsername ? s.today.noGames : s.gamesPage.setupUsername}{' '}
          <Link href="/games" className={LINK_CLASS}>
            {s.today.goToGames}
          </Link>
        </p>
      )}

      {/* xl: Drill over Last 7 days on the left, the board cards spanning both beside them, and
          Focus across the bottom. Three equal columns keep a full-width board about as tall as
          the two stacked text cards. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card title={s.today.drillTitle} className="xl:col-start-1 xl:row-start-1">
          <p className="text-3xl font-semibold">{Math.min(drill.due, drill.sessionSize)}</p>
          <p className={mutedClassName}>
            {s.today.sessionCards(Math.min(drill.due, drill.sessionSize))}
          </p>
          {drill.due > 0 && (
            <p className={mutedClassName}>
              {s.today.dueBreakdown(
                drill.due,
                drill.dueDeviations,
                drill.dueBlunders,
                drill.duePunishes,
              )}
            </p>
          )}
          <StreakBadge streak={drill.streak} week={drill.week} />
          {drill.due > 0 && (
            <Link href="/drill" className={`self-start ${buttonClass({ size: 'sm' })}`}>
              {s.today.startDrill}
            </Link>
          )}
        </Card>

        <Card title={s.today.accuracyTitle} className="xl:col-start-1 xl:row-start-2">
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

        <Card title={s.today.lastGameTitle} className="xl:col-start-2 xl:row-span-2 xl:row-start-1">
          {lastGame ? (
            <div className="flex flex-col gap-2 xl:min-h-0 xl:flex-1">
              <BoardFill>
                <Link href={`/games/${lastGame.id}`}>
                  <MiniBoard fen={lastGame.fen} boardOrientation={lastGame.myColor} />
                </Link>
              </BoardFill>
              <div className={BOARD_INFO_CLASS}>
                <p className="flex min-w-0 items-center gap-2">
                  <Link
                    href={`/games/${lastGame.id}`}
                    className={`truncate text-sm font-medium ${LINK_CLASS}`}
                  >
                    {s.today.lastGameVs(lastGame.opponent)}
                  </Link>
                  <ResultBadge result={lastGame.result} className="shrink-0" />
                </p>
                {lastGame.accuracy === null ? (
                  <p className={mutedClassName}>{s.today.notAnalyzed}</p>
                ) : (
                  <>
                    <p className="text-sm">{s.today.lastGameAccuracy(lastGame.accuracy)}</p>
                    <p className={mutedClassName}>
                      {lastGame.firstBlunderPly === null || lastGame.firstBlunderMove === null ? (
                        s.today.noBlunders
                      ) : (
                        <Link
                          href={`/games/${lastGame.id}?ply=${lastGame.firstBlunderPly - 1}`}
                          className="hover:underline"
                        >
                          {s.today.firstBlunder(lastGame.firstBlunderMove)}
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

        <Card title={s.today.puzzleTitle} className="xl:col-start-3 xl:row-span-2 xl:row-start-1">
          <div className="flex flex-col gap-2 xl:min-h-0 xl:flex-1">
            {puzzle ? (
              <Link href={`/puzzles/${puzzle.id}`} className="contents">
                <BoardFill>
                  <MiniBoard
                    fen={puzzle.fen}
                    boardOrientation={resolveOrientation(orientation, puzzleColorToMove(puzzle))}
                  />
                </BoardFill>
              </Link>
            ) : (
              <p className={mutedClassName}>{s.today.allPuzzlesSolved}</p>
            )}
            <div className={BOARD_INFO_CLASS}>
              {puzzle && (
                <Link href={`/puzzles/${puzzle.id}`} className="min-w-0 hover:underline">
                  <p className="truncate text-sm font-medium">{puzzle.title}</p>
                  <p className={mutedClassName}>
                    {s.today.puzzleLabel(puzzle.id, puzzleKindLabel(puzzle))}
                  </p>
                </Link>
              )}
              {puzzles.total > 0 && (
                // Same bar as the /puzzles header, stacked above its label.
                <div className="mt-1.5 flex max-w-xs flex-col gap-1.5 xl:max-w-none">
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
            </div>
          </div>
        </Card>

        <Card title={s.today.focusTitle} className="sm:col-span-2 xl:col-span-3">
          <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            <FocusRow
              icon={<TargetIcon className="size-4" />}
              tone="amber"
              label={s.today.weakSpotLabel}
              action={
                weakSpot && {
                  href: weakSpot.drillable
                    ? `/drill?opening=${encodeURIComponent(weakSpot.opening)}`
                    : '/blunders',
                  label: weakSpot.drillable ? s.today.drillOpening : s.today.seeBlunders,
                }
              }
            >
              {weakSpot ? (
                <>
                  <p className="text-sm font-medium">{weakSpot.opening}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {s.today.weakSpotDetail(weakSpot.blunders)}
                  </p>
                </>
              ) : (
                <p className={mutedClassName}>{s.today.noWeakSpot}</p>
              )}
            </FocusRow>

            {today.worstBlunder && (
              <FocusRow
                icon={<ZapIcon className="size-4" />}
                tone="rose"
                label={s.today.worstBlunderLabel}
                action={{
                  // One ply back, so the board shows the position before the mistake.
                  href: `/games/${today.worstBlunder.gameId}?ply=${today.worstBlunder.ply - 1}`,
                  label: s.today.reviewIt,
                }}
              >
                <p className="text-sm">
                  <span className="font-semibold">
                    {today.worstBlunder.moveLabel}
                    {today.worstBlunder.moveSan}
                  </span>{' '}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {today.worstBlunder.label}
                  </span>
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{today.worstBlunder.why}</p>
              </FocusRow>
            )}

            {lossCount > 0 && (
              <FocusRow
                icon={<FlagIcon className="size-4" />}
                tone="zinc"
                label={s.today.lossesHeading(lossCount)}
              >
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  {today.losses.map((l) => (
                    <Badge key={l.reason} tone={LOSS_TONES[l.reason]} shape="pill">
                      {l.count} {s.today.lossReasons[l.reason]}
                    </Badge>
                  ))}
                </div>
              </FocusRow>
            )}

            <FocusRow
              icon={<LibraryBigIcon className="size-4" />}
              tone="blue"
              label={s.today.repertoireLabel}
              action={
                repertoire.considered === 0 && {
                  href: '/repertoire',
                  label: s.today.buildRepertoire,
                }
              }
            >
              <p className={repertoire.considered > 0 ? 'text-sm' : mutedClassName}>
                {repertoire.considered > 0
                  ? s.today.repertoireDeviations(repertoire.deviated, repertoire.considered)
                  : s.today.noRepertoire}
              </p>
            </FocusRow>

            {today.lesson && (
              <FocusRow
                icon={<GraduationCapIcon className="size-4" />}
                tone="emerald"
                label={s.today.lessonLabel}
                action={{ href: `/learn/${today.lesson.slug}`, label: s.today.studyLesson }}
              >
                <p className="text-sm font-medium">{today.lesson.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {s.today.lessonDetail(today.lesson.games)}
                </p>
              </FocusRow>
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}

const LOSS_TONES: Record<LossReason, Tone> = {
  timeout: 'amber',
  checkmate: 'rose',
  resigned: 'zinc',
  abandoned: 'zinc',
  other: 'zinc',
}

// Both board cards reserve the same text height under the board at xl, so their boards,
// which grow into what's left, come out the same size.
const BOARD_INFO_CLASS = 'flex min-w-0 flex-col gap-0.5 xl:h-20 xl:shrink-0'

/**
 * xl: the board cards span both text rows, so the board grows into whatever height they
 * leave (a size container, square at min(width, height)). Below xl it's a plain 20rem cap.
 */
function BoardFill({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-xs xl:[container-type:size] xl:min-h-0 xl:max-w-none xl:flex-1">
      <div className="xl:w-[min(100cqw,100cqh)]">{children}</div>
    </div>
  )
}

function FocusRow({
  icon,
  tone,
  label,
  action,
  children,
}: {
  icon: React.ReactNode
  tone: Tone
  label: string
  action?: { href: string; label: string } | null | false
  children: React.ReactNode
}) {
  return (
    <li className="flex min-w-0 items-start gap-3">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${toneClass(tone)}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {label}
        </p>
        {children}
        {action && (
          <Link
            href={action.href}
            className={`mt-1 inline-block text-xs font-medium ${LINK_CLASS}`}
          >
            {action.label} →
          </Link>
        )}
      </div>
    </li>
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
