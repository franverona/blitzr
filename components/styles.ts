// Class strings for elements rendered as a <Link> in one place and a <button> in another.
// No 'use client': Server Components import these too.

export type Tone = 'emerald' | 'amber' | 'rose' | 'zinc' | 'blue' | 'accent'

export const TONE_TEXT_CLASS: Record<Tone, string> = {
  emerald: 'text-emerald-800 dark:text-emerald-400',
  amber: 'text-amber-800 dark:text-amber-400',
  rose: 'text-rose-800 dark:text-rose-400',
  zinc: 'text-zinc-800 dark:text-zinc-300',
  blue: 'text-blue-800 dark:text-blue-400',
  accent: 'text-zinc-800 dark:text-zinc-300',
}

// The light-mode ring keeps a pale badge visible on a pale surface.
const TONE_BG_CLASS: Record<Tone, string> = {
  emerald:
    'bg-emerald-100 ring-1 ring-emerald-600/30 ring-inset dark:bg-emerald-900/40 dark:ring-0',
  amber: 'bg-amber-100 ring-1 ring-amber-600/30 ring-inset dark:bg-amber-900/40 dark:ring-0',
  rose: 'bg-rose-100 ring-1 ring-rose-600/30 ring-inset dark:bg-rose-900/40 dark:ring-0',
  zinc: 'bg-zinc-100 ring-1 ring-zinc-500/30 ring-inset dark:bg-zinc-800 dark:ring-0',
  blue: 'bg-blue-100 ring-1 ring-blue-600/30 ring-inset dark:bg-blue-900/40 dark:ring-0',
  accent: 'bg-accent/20 ring-1 ring-accent/50 ring-inset dark:ring-0',
}

export function toneClass(tone: Tone): string {
  return `${TONE_BG_CLASS[tone]} ${TONE_TEXT_CLASS[tone]}`
}

export function accuracyTone(accuracy: number): Tone {
  if (accuracy >= 90) return 'emerald'
  if (accuracy >= 70) return 'amber'
  return 'rose'
}

const BUTTON_VARIANT_CLASS = {
  secondary:
    'border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-800',
  primary:
    'border-transparent bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300',
  danger:
    'border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950',
}

const BUTTON_SIZE_CLASS = {
  md: 'rounded-md px-3 py-1.5 text-sm font-medium',
  sm: 'rounded-md px-2.5 py-1 text-sm font-medium',
  xs: 'rounded-md px-2 py-1 text-xs font-medium',
}

export function buttonClass({
  variant = 'secondary',
  size = 'md',
}: {
  variant?: keyof typeof BUTTON_VARIANT_CLASS
  size?: keyof typeof BUTTON_SIZE_CLASS
} = {}): string {
  return `border disabled:opacity-40 ${BUTTON_SIZE_CLASS[size]} ${BUTTON_VARIANT_CLASS[variant]}`
}

/** A filter/mode toggle; `active` is the selected one. Same height as `INPUT_CLASS`. */
export function chipClass(active: boolean): string {
  return `rounded-md border px-3 py-1.5 text-sm ${
    active
      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-accent dark:bg-accent/20'
      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800'
  }`
}

/** One tab of a `Tabs` bar (or a bar like it). */
export function tabClass(active: boolean, vertical = false): string {
  return `${vertical ? '-mb-px border-b-2 whitespace-nowrap lg:mb-0 lg:-ml-px lg:border-b-0 lg:border-l-2 lg:text-left' : '-mb-px border-b-2'} px-4 py-2 text-sm font-medium transition-colors ${
    active
      ? 'border-accent text-zinc-900 dark:text-white'
      : 'border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200'
  }`
}

export const LINK_CLASS = 'text-blue-600 hover:underline dark:text-blue-400'

export const INPUT_CLASS =
  'rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900'

/** The big ◀/▶ buttons under a board (game, lesson, puzzle). */
export function navButtonClass(active: boolean): string {
  return `flex h-10 flex-1 items-center justify-center rounded-lg border disabled:opacity-40 ${
    active
      ? 'border-accent bg-accent/20 text-zinc-900 dark:text-white'
      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
  }`
}
