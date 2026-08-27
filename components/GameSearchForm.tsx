'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getStrings } from '@/lib/i18n/strings'

export function GameSearchForm({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue)
  const router = useRouter()
  const s = getStrings()

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = value.trim()
        if (!trimmed) return
        router.push(`/?q=${encodeURIComponent(trimmed)}`)
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          // The input's native clear ("x") button — and backspacing to empty — fire
          // this with an empty value. Reset right away instead of leaving the stale
          // filtered list until Search is pressed, and drop `q` entirely rather than
          // navigating to a bare "?q=".
          if (e.target.value === '') router.push('/')
        }}
        placeholder={s.gamesPage.searchPlaceholder}
        className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {s.gamesPage.search}
      </button>
    </form>
  )
}
