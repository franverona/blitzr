'use client'

import { buildPositionChecklist, describeChecklistFinding, findingKey } from '@/lib/checklist'
import { getStrings } from '@/lib/i18n/strings'
import type { ChecklistFinding, MyColor } from '@/lib/types'
import { useBoardContext } from './Board'
import { EvalHelp } from './EvalHelp'

// Rendered as `BoardView`'s `sidebarExtra`, stacked below the move list in
// the same width-capped column next to the board — not a separate
// full-width block after the whole board+movelist row, which needed
// scrolling well past the board to reach on every ply change. Still a
// <details> disclosure (like EvalHelp): the move list can already be tall
// on a long game, so a quiet position collapsing to one summary line keeps
// this column from growing past the board for no reason. `open` defaults
// to true only when there's actually something to see.
export function PositionChecklist({ myColor }: { myColor: MyColor }) {
  // `displayFen`, not `positions[ply]` — the latter is only ever the
  // recorded game's position, so this would keep scanning wherever the
  // game replay last was instead of following a free-explored branch
  // (`ExploreToggleButton`, Board.tsx), which is exactly the kind of
  // "position I'm stuck on" this panel is meant to help with.
  const { displayFen, hiddenFindingKeys, toggleFindingVisibility } = useBoardContext()
  const s = getStrings()
  const findings = buildPositionChecklist(displayFen)
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
        <ChecklistSection
          title={s.gamePage.checklist.yourPieces}
          findings={mine}
          hiddenFindingKeys={hiddenFindingKeys}
          toggleFindingVisibility={toggleFindingVisibility}
        />
        <ChecklistSection
          title={s.gamePage.checklist.opponentPieces}
          findings={opponent}
          hiddenFindingKeys={hiddenFindingKeys}
          toggleFindingVisibility={toggleFindingVisibility}
        />
        <EvalHelp />
      </div>
    </details>
  )
}

function ChecklistSection({
  title,
  findings,
  hiddenFindingKeys,
  toggleFindingVisibility,
}: {
  title: string
  findings: ChecklistFinding[]
  hiddenFindingKeys: Set<string>
  toggleFindingVisibility: (key: string) => void
}) {
  const s = getStrings()
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-zinc-400">{title}</h3>
      {findings.length === 0 ? (
        <p className="text-zinc-500">{s.gamePage.checklist.clean}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {findings.map((f) => {
            const key = findingKey(f)
            const isHidden = hiddenFindingKeys.has(key)
            return (
              <li key={key} className="flex items-start justify-between gap-2">
                <span className={isHidden ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
                  {describeChecklistFinding(f)}
                </span>
                <button
                  onClick={() => toggleFindingVisibility(key)}
                  className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
                >
                  {isHidden ? s.gamePage.checklist.show : s.gamePage.checklist.hide}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
