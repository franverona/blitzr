import Link from 'next/link'
import { listAnalyzedGameIds, listGames } from './actions'
import { AddPgnButton } from '@/components/AddPgnButton'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { GameList } from '@/components/GameList'
import { SyncButton } from '@/components/SyncButton'
import { getStrings } from '@/lib/i18n/strings'

const PAGE_SIZE = 50

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageParam, q } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const opponent = q?.trim() || undefined
  const [{ games, total }, analyzedGameIds] = await Promise.all([
    listGames({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, opponent }),
    listAnalyzedGameIds(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{s.gamesPage.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <BulkAnalyzeButton />
          <SyncButton />
          <AddPgnButton />
        </div>
      </div>

      <form className="flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={s.gamesPage.searchPlaceholder}
          className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {s.gamesPage.search}
        </button>
      </form>

      <GameList games={games} analyzedGameIds={analyzedGameIds} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <PageLink page={page - 1} q={q} disabled={page <= 1}>
            {s.gamesPage.previous}
          </PageLink>
          <span className="text-zinc-500 dark:text-zinc-400">
            {s.gamesPage.pageOf(page, totalPages)}
          </span>
          <PageLink page={page + 1} q={q} disabled={page >= totalPages}>
            {s.gamesPage.next}
          </PageLink>
        </div>
      )}
    </div>
  )
}

function PageLink({
  page,
  q,
  disabled,
  children,
}: {
  page: number
  q?: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return <span className="text-zinc-300 dark:text-zinc-700">{children}</span>
  }
  const params = new URLSearchParams({ page: String(page) })
  if (q) params.set('q', q)
  return (
    <Link href={`/?${params}`} className="hover:underline">
      {children}
    </Link>
  )
}
