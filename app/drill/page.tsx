import { cookies } from 'next/headers'
import { getDrillDeck } from '../actions'
import { DrillFilters } from '@/components/DrillFilters'
import { DrillProgress } from '@/components/DrillProgress'
import { DrillSession } from '@/components/DrillSession'
import { TroubleCards } from '@/components/TroubleCards'
import { getStrings } from '@/lib/i18n/strings'
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
  const { prompts, totalCards, dueCount, troubles, forecast, learned } = await getDrillDeck({
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
        header={
          <div className="flex flex-col gap-2">
            <h1 className="text-base font-semibold">{getStrings().drillPage.title}</h1>
            <DrillFilters sourceType={sourceType} opening={opening} />
          </div>
        }
      />
      <DrillProgress forecast={forecast} learned={learned} />
      <TroubleCards troubles={troubles} />
    </div>
  )
}
