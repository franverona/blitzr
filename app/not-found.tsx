import Link from 'next/link'
import { getStrings } from '@/lib/i18n/strings'
import { buttonClass } from '@/components/styles'

export default function NotFound() {
  const s = getStrings()
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">{s.routeStatus.notFoundTitle}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.routeStatus.notFoundBody}</p>
      <Link href="/games" className={buttonClass()}>
        {s.routeStatus.backToGames}
      </Link>
    </div>
  )
}
