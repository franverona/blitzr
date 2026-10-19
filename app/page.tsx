import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getGameAccuracyById, getUnanalyzedGames, listGames } from './actions'
import { AddPgnButton } from '@/components/AddPgnButton'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { GameList } from '@/components/GameList'
import { GameSearchForm } from '@/components/GameSearchForm'
import { SyncButton } from '@/components/SyncButton'
import { hasChesscomUsername } from '@/lib/config'
import { getStrings } from '@/lib/i18n/strings'
import type { MyColor, MyResult } from '@/lib/types'

const PAGE_SIZE = 50

type GamesSearchParams = {
  page?: string
  q?: string
  result?: string
  color?: string
  rated?: string
  accOp?: string
  accValue?: string
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<GamesSearchParams>
}) {
  const { page: pageParam, q, result, color, rated, accOp, accValue } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const opponent = q?.trim() || undefined

  // Accuracy isn't a column, so the filter narrows to an id set first.
  const [accuracyByGameId, unanalyzedGames] = await Promise.all([
    getGameAccuracyById(),
    getUnanalyzedGames(),
  ])
  const accuracyThreshold = accValue !== undefined ? Number(accValue) : undefined
  const gameIds =
    (accOp === 'gte' || accOp === 'lte') && accuracyThreshold !== undefined
      ? Object.entries(accuracyByGameId)
          .filter(([, acc]) =>
            accOp === 'gte' ? acc.accuracy >= accuracyThreshold : acc.accuracy <= accuracyThreshold,
          )
          .map(([id]) => id)
      : undefined

  const { games, total } = await listGames({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    opponent,
    result: result as MyResult | undefined,
    color: color as MyColor | undefined,
    rated: rated ? rated === 'true' : undefined,
    gameIds,
  })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filters = { q, result, color, rated, accOp, accValue }
  const filtered = Object.values(filters).some((v) => v !== undefined && v !== '')
  // A stale or hand-typed page past the end would otherwise show "no games".
  if (page > totalPages) redirect(pageHref(totalPages, filters))
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">{s.gamesPage.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <BulkAnalyzeButton hasUnanalyzedGames={unanalyzedGames.length > 0} />
          <SyncButton />
          <AddPgnButton />
        </div>
      </div>

      <SetupNotice
        hasUsername={hasChesscomUsername()}
        // Unfiltered, games without accuracy are unanalyzed, so none analyzed means a fresh sync.
        suggestAnalyze={
          !filtered &&
          total > 0 &&
          Object.keys(accuracyByGameId).length === 0 &&
          unanalyzedGames.length > 0
        }
      />

      <GameSearchForm
        // q/accOp/accValue excluded so typing and the accuracy popover survive their own navigations.
        key={`${result ?? ''}-${color ?? ''}-${rated ?? ''}`}
        defaultValue={q ?? ''}
        result={result}
        color={color}
        rated={rated}
        accOp={accOp}
        accValue={accValue}
      />

      <GameList games={games} accuracyByGameId={accuracyByGameId} filtered={filtered} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <PageLink page={page - 1} filters={filters} disabled={page <= 1}>
            {s.gamesPage.previous}
          </PageLink>
          <span className="text-zinc-500 dark:text-zinc-400">
            {s.gamesPage.pageOf(page, totalPages)}
          </span>
          <PageLink page={page + 1} filters={filters} disabled={page >= totalPages}>
            {s.gamesPage.next}
          </PageLink>
        </div>
      )}
    </div>
  )
}

/** First-run steps: set the username, then (after a sync) analyze. */
function SetupNotice({
  hasUsername,
  suggestAnalyze,
}: {
  hasUsername: boolean
  suggestAnalyze: boolean
}) {
  const s = getStrings()
  if (hasUsername && !suggestAnalyze) return null
  return (
    <div
      role="status"
      className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
    >
      {hasUsername ? s.gamesPage.setupAnalyze : s.gamesPage.setupUsername}
    </div>
  )
}

function pageHref(page: number, filters: Omit<GamesSearchParams, 'page'>): string {
  const params = new URLSearchParams({ page: String(page) })
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return `/?${params}`
}

function PageLink({
  page,
  filters,
  disabled,
  children,
}: {
  page: number
  filters: Omit<GamesSearchParams, 'page'>
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return <span className="text-zinc-300 dark:text-zinc-700">{children}</span>
  }
  return (
    <Link href={pageHref(page, filters)} className="hover:underline">
      {children}
    </Link>
  )
}
