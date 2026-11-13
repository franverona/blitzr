import Link from 'next/link'
import { LINK_CLASS, toneClass, type Tone } from './styles'

/** A tinted icon tile, a small label and its content: Today's sections. Renders an `<li>`. */
export function FocusRow({
  icon,
  tone,
  label,
  action,
  children,
}: {
  icon: React.ReactNode
  tone: Tone
  label: string
  action?: { href: string; label: string } | null | false
  children: React.ReactNode
}) {
  return (
    <li className="flex min-w-0 items-start gap-3">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${toneClass(tone)}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {label}
        </p>
        {children}
        {action && (
          <Link
            href={action.href}
            className={`mt-1 inline-block text-xs font-medium ${LINK_CLASS}`}
          >
            {action.label} →
          </Link>
        )}
      </div>
    </li>
  )
}
