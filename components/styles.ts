// Class strings for elements rendered as a <Link> in one place and a <button> in another.
// No 'use client': Server Components import these too.

export type Tone = 'emerald' | 'amber' | 'rose' | 'zinc' | 'blue' | 'accent'

export const TONE_TEXT_CLASS: Record<Tone, string> = {
  emerald: 'text-emerald-700 dark:text-emerald-400',
  amber: 'text-amber-700 dark:text-amber-400',
  rose: 'text-rose-700 dark:text-rose-400',
  zinc: 'text-zinc-700 dark:text-zinc-300',
  blue: 'text-blue-700 dark:text-blue-400',
  accent: 'text-zinc-700 dark:text-zinc-300',
}

const TONE_BG_CLASS: Record<Tone, string> = {
  emerald: 'bg-emerald-100 dark:bg-emerald-900/40',
  amber: 'bg-amber-100 dark:bg-amber-900/40',
  rose: 'bg-rose-100 dark:bg-rose-900/40',
  zinc: 'bg-zinc-200 dark:bg-zinc-800',
  blue: 'bg-blue-100 dark:bg-blue-900/40',
  accent: 'bg-accent/20',
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
  secondary: 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
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

/** A filter/mode toggle; `active` is the selected one. */
export function chipClass(active: boolean, padding = 'px-3 py-1'): string {
  return `rounded-md border ${padding} ${
    active
      ? 'border-accent bg-accent/20 text-zinc-900 dark:text-white'
      : 'border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
  }`
}

export const LINK_CLASS = 'text-blue-600 hover:underline dark:text-blue-400'

export const INPUT_CLASS =
  'rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900'

/** The big ◀/▶ buttons under a board (game, lesson, puzzle). */
export function navButtonClass(active: boolean): string {
  return `flex h-10 flex-1 items-center justify-center rounded-lg border disabled:opacity-40 ${
    active
      ? 'border-accent bg-accent/20 text-zinc-900 dark:text-white'
      : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
  }`
}
