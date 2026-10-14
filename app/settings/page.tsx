import { SettingsForm } from '@/components/SettingsForm'
import { getStrings } from '@/lib/i18n/strings'

export default function SettingsPage() {
  const s = getStrings()

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold">{s.settings.title}</h1>
      </div>
      <SettingsForm />
    </div>
  )
}
