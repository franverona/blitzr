'use client'

import { Fragment, useState } from 'react'
import { getStrings } from '@/lib/i18n/strings'
import type { OpeningFamily } from '@/lib/types'

function pct(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function OpeningsTable({ families }: { families: OpeningFamily[] }) {
  const s = getStrings()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (families.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.openingsTable.empty}</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 text-left text-xs tracking-wide text-zinc-500 uppercase dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2">{s.openingsTable.headers.opening}</th>
            <th className="px-3 py-2">{s.openingsTable.headers.eco}</th>
            <th className="px-3 py-2">{s.openingsTable.headers.games}</th>
            <th className="px-3 py-2">{s.openingsTable.headers.wdl}</th>
            <th className="px-3 py-2">{s.openingsTable.headers.asWhite}</th>
            <th className="px-3 py-2">{s.openingsTable.headers.asBlack}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {families.map((family) => {
            const key = family.ecoCode ?? 'unknown'
            const isOpen = expanded.has(key)
            return (
              <Fragment key={key}>
                <tr
                  onClick={() => toggle(key)}
                  className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-2 font-medium">
                    <span className="mr-1 inline-block w-3 text-zinc-400">
                      {isOpen ? '▾' : '▸'}
                    </span>
                    {family.label}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {family.ecoCode ?? '—'}
                  </td>
                  <td className="px-3 py-2">{family.games}</td>
                  <td className="px-3 py-2">
                    {family.wins} / {family.draws} / {family.losses}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {family.whiteGames > 0
                      ? `${pct(family.whiteScore)} (${family.whiteGames})`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {family.blackGames > 0
                      ? `${pct(family.blackScore)} (${family.blackGames})`
                      : '—'}
                  </td>
                </tr>
                {isOpen &&
                  family.lines.map((line) => (
                    <tr
                      key={`${key}-${line.ecoName}`}
                      className="bg-zinc-50/60 dark:bg-zinc-900/30"
                    >
                      <td className="py-1.5 pr-3 pl-8 text-zinc-600 dark:text-zinc-400" colSpan={2}>
                        {line.ecoName}
                      </td>
                      <td className="py-1.5 pr-3 text-zinc-600 dark:text-zinc-400">{line.games}</td>
                      <td className="py-1.5 pr-3 text-zinc-600 dark:text-zinc-400" colSpan={3}>
                        {line.wins} / {line.draws} / {line.losses}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
