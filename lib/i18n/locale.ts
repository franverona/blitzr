export type Locale = 'en' | 'es'

/** Chosen once per deployment via NEXT_PUBLIC_LOCALE (needs the NEXT_PUBLIC_
 *  prefix, unlike DB_TYPE/CHESSCOM_USERNAME, so client components can read it
 *  too — Next.js inlines NEXT_PUBLIC_* vars into both server and client code
 *  at build time, so this works everywhere with no Context/Provider. */
export function getLocale(): Locale {
  return process.env.NEXT_PUBLIC_LOCALE === 'es' ? 'es' : 'en'
}
