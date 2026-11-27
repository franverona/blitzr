import { SettingsForm } from '@/components/SettingsForm'
import { getStrings } from '@/lib/i18n/strings'
import { PageHeader } from '@/components/PageHeader'

/** `?tab=…` opens a section; SettingsForm validates it. */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const s = getStrings()
  const { tab } = await searchParams

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={s.settings.title} />
      <SettingsForm initialSection={tab} />
    </div>
  )
}
