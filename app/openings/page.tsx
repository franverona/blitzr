import { listOpenings } from '../actions'
import { OpeningsTable } from '@/components/OpeningsTable'
import { getStrings } from '@/lib/i18n/strings'
import { PageHeader } from '@/components/PageHeader'

export default async function OpeningsPage() {
  const families = await listOpenings()
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={s.openingsPage.title}
        subtitle={
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.openingsPage.intro}</p>
        }
      />
      <OpeningsTable families={families} />
    </div>
  )
}
