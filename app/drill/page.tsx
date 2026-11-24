import { cookies } from 'next/headers'
import { getDrillDeck } from '../actions'
import { DrillSession } from '@/components/DrillSession'
import type { DrillSourceType } from '@/lib/types'

export default async function DrillPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; opening?: string }>
}) {
  const { type, opening } = await searchParams
  const sourceType: DrillSourceType | undefined =
    type === 'deviation' || type === 'blunder' || type === 'punish' || type === 'mate'
      ? type
      : undefined
  const { prompts, totalCards, dueCount } = await getDrillDeck({
    sourceType,
    opening,
  })

  const deckKey = `${sourceType ?? 'all'}:${opening ?? 'all'}`

  return (
    <div className="flex flex-col gap-4">
      <DrillSession
        key={deckKey}
        deckKey={deckKey}
        prompts={prompts}
        totalCards={totalCards}
        dueCount={dueCount}
        filtered={Boolean(sourceType || opening)}
        initialAutoAdvance={(await cookies()).get('blitzr-drill-auto-advance')?.value === '1'}
        sourceType={sourceType}
        opening={opening}
      />
    </div>
  )
}
