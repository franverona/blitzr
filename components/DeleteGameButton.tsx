'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { deleteManualGame } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { startRouteProgress } from './RouteProgressBar'

export function DeleteGameButton({ gameId }: { gameId: string }) {
  const s = getStrings()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(s.gamePage.deleteGameConfirm)) return
    startTransition(async () => {
      await deleteManualGame(gameId)
      startRouteProgress()
      router.push('/')
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
    >
      {s.gamePage.deleteGame}
    </button>
  )
}
