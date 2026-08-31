import { listOpenings } from '../actions'
import { OpeningsTable } from '@/components/OpeningsTable'
import { getStrings } from '@/lib/i18n/strings'

export default async function OpeningsPage() {
  const families = await listOpenings()
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">{s.openingsPage.title}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.openingsPage.intro}</p>
      </div>
      <OpeningsTable families={families} />
    </div>
  )
}
