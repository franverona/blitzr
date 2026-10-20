import { SettingsForm } from '@/components/SettingsForm'
import { getStrings } from '@/lib/i18n/strings'
import { PageHeader } from '@/components/PageHeader'

export default function SettingsPage() {
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={s.settings.title} />
      <SettingsForm />
    </div>
  )
}
