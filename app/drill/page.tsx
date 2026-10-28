import { cookies } from 'next/headers'
import { getDrillDeck } from '../actions'
import { DrillFilters } from '@/components/DrillFilters'
import { DrillSession } from '@/components/DrillSession'
import { TroubleCards } from '@/components/TroubleCards'
import { getStrings } from '@/lib/i18n/strings'
import type { DrillSourceType } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'

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
  const { prompts, totalCards, dueCount, troubles } = await getDrillDeck({
    sourceType,
    opening,
  })

  const deckKey = `${sourceType ?? 'all'}:${opening ?? 'all'}`

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={getStrings().drillPage.title} />
      <DrillFilters sourceType={sourceType} opening={opening} />
      <DrillSession
        key={deckKey}
        deckKey={deckKey}
        prompts={prompts}
        totalCards={totalCards}
        dueCount={dueCount}
        filtered={Boolean(sourceType || opening)}
        initialAutoAdvance={(await cookies()).get('blitzr-drill-auto-advance')?.value === '1'}
      />
      <TroubleCards troubles={troubles} />
    </div>
  )
}
