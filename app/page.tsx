import Link from 'next/link'
import { listAnalyzedGameIds, listGames } from './actions'
import { AddPgnButton } from '@/components/AddPgnButton'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { GameList } from '@/components/GameList'
import { GameSearchForm } from '@/components/GameSearchForm'
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

      <GameSearchForm key={q ?? ''} defaultValue={q ?? ''} />

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
