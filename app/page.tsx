import Link from 'next/link'
import { listGames } from './actions'
import { BulkAnalyzeButton } from '@/components/BulkAnalyzeButton'
import { GameList } from '@/components/GameList'
import { SyncButton } from '@/components/SyncButton'
import { getStrings } from '@/lib/i18n/strings'

const PAGE_SIZE = 50

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const { games, total } = await listGames({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{s.gamesPage.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <BulkAnalyzeButton />
          <SyncButton />
        </div>
      </div>

      <GameList games={games} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <PageLink page={page - 1} disabled={page <= 1}>
            {s.gamesPage.previous}
          </PageLink>
          <span className="text-zinc-500 dark:text-zinc-400">
            {s.gamesPage.pageOf(page, totalPages)}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages}>
            {s.gamesPage.next}
          </PageLink>
        </div>
      )}
    </div>
  )
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return <span className="text-zinc-300 dark:text-zinc-700">{children}</span>
  }
  return (
    <Link href={`/?page=${page}`} className="hover:underline">
      {children}
    </Link>
  )
}
