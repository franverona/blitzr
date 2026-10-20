import type { ComponentProps } from 'react'
import { toneClass, type Tone } from './styles'

const SHAPE_CLASS = {
  /** Small uppercase marker ("Blunder", "Mate in 2"). */
  tag: 'rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
  label: 'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
  pill: 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
}

export function Badge({
  tone,
  shape = 'label',
  className = '',
  ...props
}: ComponentProps<'span'> & { tone: Tone; shape?: keyof typeof SHAPE_CLASS }) {
  return <span {...props} className={`${SHAPE_CLASS[shape]} ${toneClass(tone)} ${className}`} />
}
