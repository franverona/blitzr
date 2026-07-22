import { getDrillDeck } from '../actions'
import { DrillFilters } from '@/components/DrillFilters'
import { DrillSession } from '@/components/DrillSession'
import type { DrillSourceType } from '@/lib/types'

export default async function DrillPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; opening?: string }>
}) {
  const { type, opening } = await searchParams
  const sourceType: DrillSourceType | undefined =
    type === 'deviation' || type === 'blunder' ? type : undefined
  const { prompts, totalCards, dueCount, availableOpenings } = await getDrillDeck({
    sourceType,
    opening,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Drill</h1>
      <DrillFilters
        sourceType={sourceType}
        opening={opening}
        availableOpenings={availableOpenings}
      />
      <DrillSession
        key={`${sourceType ?? 'all'}:${opening ?? 'all'}`}
        prompts={prompts}
        totalCards={totalCards}
        dueCount={dueCount}
        filtered={Boolean(sourceType || opening)}
      />
    </div>
  )
}
