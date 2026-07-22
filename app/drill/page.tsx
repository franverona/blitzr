import { getDrillDeck } from '../actions'
import { DrillSession } from '@/components/DrillSession'

export default async function DrillPage() {
  const { prompts, totalCards } = await getDrillDeck()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Drill</h1>
      <DrillSession prompts={prompts} totalCards={totalCards} />
    </div>
  )
}
