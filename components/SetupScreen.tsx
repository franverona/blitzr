import Image from 'next/image'
import { getStrings } from '@/lib/i18n/strings'

/** Every page, in place of the app, while neither username is set (`app/layout.tsx`). */
export function SetupScreen() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Image src="/icon.svg" alt="Blitzr" width={64} height={64} priority />
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        {getStrings().setup.message}
      </p>
    </main>
  )
}
