import { listOpenings } from '../actions'
import { OpeningsTable } from '@/components/OpeningsTable'

export default async function OpeningsPage() {
  const families = await listOpenings()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Openings</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Grouped by ECO family. Click a row to see the specific named lines within it.
      </p>
      <OpeningsTable families={families} />
    </div>
  )
}
