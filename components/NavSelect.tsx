'use client'

import { useRouter } from 'next/navigation'
import { startRouteProgress } from './RouteProgressBar'
import { Select } from './Select'
import { INPUT_CLASS } from './styles'

/** A `<Select>` whose options are links: picking one navigates to its `href`. */
export function NavSelect({
  value,
  options,
  label,
}: {
  value: string
  options: { value: string; label: string; href: string }[]
  label: string
}) {
  const router = useRouter()
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(e) => {
        const option = options.find((o) => o.value === e.target.value)
        if (!option) return
        startRouteProgress()
        router.push(option.href)
      }}
      className={INPUT_CLASS}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  )
}
