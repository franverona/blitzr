import { getStrings } from '@/lib/i18n/strings'

// Shared "how to read this" glossary for eval/blunder notation — used by
// GameAnalysisPanel's analysis dialog and the /blunders page, so the
// explanation only needs to be written (and kept accurate) once.
export function EvalHelp() {
  const s = getStrings()
  return (
    <details className="text-xs text-zinc-500">
      <summary className="cursor-pointer select-none hover:text-zinc-300">
        {s.evalHelp.summary}
      </summary>
      <div className="mt-1.5 flex flex-col gap-1.5 border-l border-zinc-800 pl-3">
        {s.evalHelp.entries.map((entry) => (
          <p key={entry.term}>
            <span className="font-medium text-zinc-400">{entry.term}</span> {entry.body}
          </p>
        ))}
      </div>
    </details>
  )
}
