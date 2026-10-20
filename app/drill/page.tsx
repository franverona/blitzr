import { cookies } from 'next/headers'
import { getDrillDeck } from '../actions'
import { DrillFilters } from '@/components/DrillFilters'
import { DrillSession } from '@/components/DrillSession'
import { getStrings } from '@/lib/i18n/strings'
import type { DrillSourceType } from '@/lib/types'

export default async function DrillPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; opening?: string }>
}) {
  const { type, opening } = await searchParams
  const sourceType: DrillSourceType | undefined =
    type === 'deviation' || type === 'blunder' ? type : undefined
  const { prompts, totalCards, dueCount } = await getDrillDeck({
    sourceType,
    opening,
  })

  const deckKey = `${sourceType ?? 'all'}:${opening ?? 'all'}`

  return (
    <div className="flex flex-col gap-4">
      <h1 className="border-b border-zinc-200 pb-4 text-xl font-semibold dark:border-zinc-800">
        {getStrings().drillPage.title}
      </h1>
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
    </div>
  )
}
