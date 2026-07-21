import Link from 'next/link'
import { listGames } from './actions'
import { GameList } from '@/components/GameList'
import { SyncButton } from '@/components/SyncButton'

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Games</h1>
        <SyncButton />
      </div>

      <GameList games={games} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <PageLink page={page - 1} disabled={page <= 1}>
            Previous
          </PageLink>
          <span className="text-zinc-500 dark:text-zinc-400">
            Page {page} of {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages}>
            Next
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
