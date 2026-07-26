'use client'

import { buildPositionChecklist, describeChecklistFinding } from '@/lib/checklist'
import { getStrings } from '@/lib/i18n/strings'
import type { ChecklistFinding, MyColor } from '@/lib/types'
import { useBoardContext } from './Board'
import { EvalHelp } from './EvalHelp'

// Always visible (not a <details> disclosure like EvalHelp) — every other
// per-position line on the game page (material diff, eval, better-move
// hint) is already always-visible, not opt-in.
export function PositionChecklist({ myColor }: { myColor: MyColor }) {
  const { positions, ply } = useBoardContext()
  const s = getStrings()
  const findings = buildPositionChecklist(positions[ply])
  const mine = findings.filter((f) => f.side === myColor)
  const opponent = findings.filter((f) => f.side !== myColor)

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
      <h2 className="font-semibold text-zinc-200">{s.gamePage.checklist.heading}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChecklistSection title={s.gamePage.checklist.yourPieces} findings={mine} />
        <ChecklistSection title={s.gamePage.checklist.opponentPieces} findings={opponent} />
      </div>
      <EvalHelp />
    </div>
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
