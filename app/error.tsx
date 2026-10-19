'use client'

import { getStrings } from '@/lib/i18n/strings'

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const s = getStrings()
  // Server errors arrive redacted in production; the digest matches the server log.
  const digest = error instanceof Error && 'digest' in error ? String(error.digest) : null

  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">{s.routeStatus.errorTitle}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.routeStatus.errorBody}</p>
      {digest && <p className="font-mono text-xs text-zinc-500">{digest}</p>}
      <button
        onClick={retry}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {s.routeStatus.retry}
      </button>
    </div>
  )
}
