import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getGameAccuracyById,
  getPracticeAccuracyById,
  getUnanalyzedGames,
  getGameSites,
  listGameIds,
  listGames,
} from '../actions'
import { AddPgnButton } from '@/components/AddPgnButton'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { GameList } from '@/components/GameList'
import { GameSearchForm } from '@/components/GameSearchForm'
import { SyncButton } from '@/components/SyncButton'
import {
  GAME_SORTS,
  parseGameSort,
  sortIdsByAccuracy,
  type GameSort,
  type SortDir,
} from '@/lib/gameSort'
import type { ListGamesParams } from '@/lib/db/sqlite/repository'
import { getStrings } from '@/lib/i18n/strings'
import type { Game, GameAccuracy, MyColor, MyResult } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'

const PAGE_SIZE = 50

type GamesSearchParams = {
  page?: string
  q?: string
  result?: string
  color?: string
  rated?: string
  site?: string
  accOp?: string
  accValue?: string
  practice?: string
  fav?: string
  sort?: string
  dir?: string
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // A repeated key (`?q=a&q=b`) arrives as an array; it's dropped rather than trusted as a string.
  const {
    page: pageParam,
    q,
    result,
    color,
    rated,
    site: siteParam,
    accOp,
    accValue,
    practice,
    fav,
    sort: sortParam,
    dir: dirParam,
  }: GamesSearchParams = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => typeof v === 'string'),
  )
  const site = siteParam === 'chesscom' || siteParam === 'lichess' ? siteParam : undefined
  // Practice games only; they have no accuracy filter, since getGameAccuracyById() skips them.
  const practiceOnly = practice === '1'
  const favoritesOnly = !practiceOnly && fav === '1'
  const page = Math.max(1, Number(pageParam) || 1)
  const opponent = q?.trim() || undefined

  // Accuracy isn't a column, so the filter narrows to an id set first.
  const [accuracyByGameId, unanalyzedGames, sites] = await Promise.all([
    getGameAccuracyById(),
    getUnanalyzedGames(),
    getGameSites(),
  ])
  // `Number('')` is 0, and a malformed value is NaN, which would match no game.
  const accuracyThreshold = accValue ? Number(accValue) : NaN
  const gameIds =
    !practiceOnly && (accOp === 'gte' || accOp === 'lte') && Number.isFinite(accuracyThreshold)
      ? Object.entries(accuracyByGameId)
          .filter(([, acc]) =>
            accOp === 'gte' ? acc.accuracy >= accuracyThreshold : acc.accuracy <= accuracyThreshold,
          )
          .map(([id]) => id)
      : undefined

  const { sort, dir } = parseGameSort(sortParam, dirParam)
  const offset = (page - 1) * PAGE_SIZE
  const filterParams: ListGamesParams = {
    opponent,
    result: result as MyResult | undefined,
    color: color as MyColor | undefined,
    rated: rated ? rated === 'true' : undefined,
    site: practiceOnly ? undefined : site,
    gameIds,
    practice: practiceOnly,
    favorite: favoritesOnly,
  }
  let games: Game[]
  let total: number
  let accuracies: Record<string, GameAccuracy>
  if (sort === 'accuracy' || sort === 'errors') {
    // Not columns: every match is ordered here, then one page of them fetched.
    const ids = await listGameIds(filterParams)
    accuracies = practiceOnly ? await getPracticeAccuracyById(ids) : accuracyByGameId
    const pageIds = sortIdsByAccuracy(ids, accuracies, sort, dir).slice(offset, offset + PAGE_SIZE)
    const byId = new Map(
      (await listGames({ ...filterParams, gameIds: pageIds })).games.map((g) => [g.id, g]),
    )
    games = pageIds.flatMap((id) => byId.get(id) ?? [])
    total = ids.length
  } else {
    ;({ games, total } = await listGames({
      ...filterParams,
      limit: PAGE_SIZE,
      offset,
      sort,
      dir,
    }))
    accuracies = practiceOnly
      ? await getPracticeAccuracyById(games.map((g) => g.id))
      : accuracyByGameId
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filters = practiceOnly
    ? { q, result, color, practice }
    : { q, result, color, rated, site, accOp, accValue, fav: favoritesOnly ? '1' : undefined }
  const filtered = Object.values(filters).some((v) => v !== undefined && v !== '')
  // The default sort stays out of the URL.
  const sortQuery = (col: GameSort, d: SortDir) =>
    col === 'date' && d === 'desc' ? {} : { sort: col, dir: d }
  const linkParams = { ...filters, ...sortQuery(sort, dir) }
  // The active column flips; another starts descending (newest, highest, most errors), which is
  // what sorting by it is usually for. Page 1, as the old page means nothing in the new order.
  const sortHrefs = Object.fromEntries(
    GAME_SORTS.map((col) => {
      const d = col === sort && dir === 'desc' ? 'asc' : 'desc'
      return [col, pageHref(1, { ...filters, ...sortQuery(col, d) })]
    }),
  ) as Record<GameSort, string>
  // A stale or hand-typed page past the end would otherwise show "no games".
  if (page > totalPages) redirect(pageHref(totalPages, linkParams))
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={s.gamesPage.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BulkAnalyzeButton unanalyzedGames={unanalyzedGames.length} />
            <SyncButton />
            <AddPgnButton />
          </div>
        }
      />

      <SetupNotice
        // Unfiltered, games without accuracy are unanalyzed, so none analyzed means a fresh sync.
        suggestAnalyze={
          !filtered &&
          total > 0 &&
          Object.keys(accuracyByGameId).length === 0 &&
          unanalyzedGames.length > 0
        }
      />

      <GameSearchForm
        defaultValue={q ?? ''}
        result={result}
        color={color}
        rated={rated}
        site={site}
        // A set filter stays visible so it can be cleared.
        showSite={sites.length > 1 || site !== undefined}
        accOp={accOp}
        accValue={accValue}
        practice={practiceOnly ? '1' : undefined}
        fav={favoritesOnly ? '1' : undefined}
        sort={sortQuery(sort, dir)}
      />

      <GameList
        games={games}
        accuracyByGameId={accuracies}
        filtered={filtered}
        selectable={practiceOnly}
        sort={{ sort, dir, hrefs: sortHrefs }}
        emptyText={
          practiceOnly && !opponent && !result && !color && !rated
            ? s.gameList.noPractice
            : undefined
        }
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <PageLink page={page - 1} filters={linkParams} disabled={page <= 1}>
            {s.gamesPage.previous}
          </PageLink>
          <span className="text-zinc-600 dark:text-zinc-400">
            {s.gamesPage.pageOf(page, totalPages)}
          </span>
          <PageLink page={page + 1} filters={linkParams} disabled={page >= totalPages}>
            {s.gamesPage.next}
          </PageLink>
        </div>
      )}
    </div>
  )
}

/** After a first sync, a nudge to analyze. (A missing username is the layout's setup screen.) */
function SetupNotice({ suggestAnalyze }: { suggestAnalyze: boolean }) {
  const s = getStrings()
  if (!suggestAnalyze) return null
  return (
    <div
      role="status"
      className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
    >
      {s.gamesPage.setupAnalyze}
    </div>
  )
}

function pageHref(page: number, filters: Omit<GamesSearchParams, 'page'>): string {
  const params = new URLSearchParams({ page: String(page) })
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return `/games?${params}`
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
