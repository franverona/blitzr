import { getStrings } from '@/lib/i18n/strings'

export default function Loading() {
  return (
    <div role="status" className="flex animate-pulse flex-col gap-4">
      <span className="sr-only">{getStrings().routeStatus.loading}</span>
      <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="h-7 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-10 rounded bg-zinc-200 dark:bg-zinc-800" />
      ))}
    </div>
  )
}
