'use client'

import { buildPositionChecklist, describeChecklistFinding } from '@/lib/checklist'
import { getStrings } from '@/lib/i18n/strings'
import type { ChecklistFinding, MyColor } from '@/lib/types'
import { useBoardContext } from './Board'
import { EvalHelp } from './EvalHelp'

// A <details> disclosure (like EvalHelp), not an always-open block — the
// game page is already tall (board, move list, analysis panel), and a
// permanently-expanded two-section panel plus the glossary pushed everyone
// into scrolling well past the board just to reach it. The summary line
// names the finding count so there's no need to open it just to check
// whether it's empty, and `open` defaults to true only when there's
// actually something to see — a quiet position collapses to one line.
export function PositionChecklist({ myColor }: { myColor: MyColor }) {
  const { positions, ply } = useBoardContext()
  const s = getStrings()
  const findings = buildPositionChecklist(positions[ply])
  const mine = findings.filter((f) => f.side === myColor)
  const opponent = findings.filter((f) => f.side !== myColor)

  return (
    <details
      open={findings.length > 0}
      className="rounded-md border border-zinc-800 bg-zinc-900/50 text-sm"
    >
      <summary className="cursor-pointer p-4 font-semibold text-zinc-200 select-none">
        {s.gamePage.checklist.summary(findings.length)}
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ChecklistSection title={s.gamePage.checklist.yourPieces} findings={mine} />
          <ChecklistSection title={s.gamePage.checklist.opponentPieces} findings={opponent} />
        </div>
        <EvalHelp />
      </div>
    </details>
  )
}

function ChecklistSection({ title, findings }: { title: string; findings: ChecklistFinding[] }) {
  const s = getStrings()
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-zinc-400">{title}</h3>
      {findings.length === 0 ? (
        <p className="text-zinc-500">{s.gamePage.checklist.clean}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {findings.map((f, i) => (
            <li key={i} className="text-zinc-300">
              {describeChecklistFinding(f)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
