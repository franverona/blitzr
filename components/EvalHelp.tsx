import { getStrings } from '@/lib/i18n/strings'

export function EvalHelp() {
  const s = getStrings()
  return (
    <details className="text-xs text-zinc-500">
      <summary className="cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-300">
        {s.evalHelp.summary}
      </summary>
      <div className="mt-1.5 flex flex-col gap-1.5 border-l border-zinc-200 pl-3 dark:border-zinc-800">
        {s.evalHelp.entries.map((entry) => (
          <p key={entry.term}>
            <span className="font-medium text-zinc-600 dark:text-zinc-400">{entry.term}</span>{' '}
            {entry.body}
          </p>
        ))}
      </div>
    </details>
  )
}
