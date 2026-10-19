import Link from 'next/link'
import { getStrings } from '@/lib/i18n/strings'

export default function NotFound() {
  const s = getStrings()
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">{s.routeStatus.notFoundTitle}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.routeStatus.notFoundBody}</p>
      <Link
        href="/games"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {s.routeStatus.backToGames}
      </Link>
    </div>
  )
}
