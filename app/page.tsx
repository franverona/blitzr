import Link from 'next/link'
import { getGameAccuracyById, getUnanalyzedGames, listGames } from './actions'
import { AddPgnButton } from '@/components/AddPgnButton'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { GameList } from '@/components/GameList'
import { GameSearchForm } from '@/components/GameSearchForm'
import { SyncButton } from '@/components/SyncButton'
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

  // Accuracy isn't a DB column — it's computed per game from saved analysis
  // (see getGameAccuracyById()) — so an active accuracy filter has to fetch
  // that map first, narrow it to a matching id set, then hand those ids to
  // listGames() rather than becoming a SQL predicate of its own.
  // getUnanalyzedGames() rides along here too, just to know whether "Analyze
  // all" has anything left to do — BulkAnalyzeButton disables itself instead
  // of the click-then-toast round trip when there's nothing to analyze.
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
  const s = getStrings()
  const filters = { q, result, color, rated, accOp, accValue }

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

      <GameSearchForm
        // accOp/accValue deliberately excluded — the accuracy popover's own
        // navigation (pick a direction, drag the slider) needs to keep this
        // component's instance alive so its `open` state survives; see
        // GameSearchForm's own effect for how it re-syncs from accValue
        // instead.
        key={`${q ?? ''}-${result ?? ''}-${color ?? ''}-${rated ?? ''}`}
        defaultValue={q ?? ''}
        result={result}
        color={color}
        rated={rated}
        accOp={accOp}
        accValue={accValue}
      />

      <GameList games={games} accuracyByGameId={accuracyByGameId} />

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
  const params = new URLSearchParams({ page: String(page) })
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return (
    <Link href={`/?${params}`} className="hover:underline">
      {children}
    </Link>
  )
}
