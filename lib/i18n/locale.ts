export type Locale = 'en' | 'es'

/** NEXT_PUBLIC_ so client components can read it too (inlined at build time). */
export function getLocale(): Locale {
  return process.env.NEXT_PUBLIC_LOCALE === 'es' ? 'es' : 'en'
}
