'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { deleteManualGame } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { startRouteProgress } from './RouteProgressBar'

export interface DeleteGameTarget {
  gameId: string
  /** Defaults to the games list. */
  redirectTo?: string
  /** Defaults to the pasted-game wording. */
  confirmText?: string
}

/** Confirms, deletes and navigates away; shared by the button and the game page's actions menu. */
export function useDeleteGame(target: DeleteGameTarget | undefined) {
  const s = getStrings()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function deleteGame() {
    if (!target) return
    if (!window.confirm(target.confirmText ?? s.gamePage.deleteGameConfirm)) return
    startTransition(async () => {
      await deleteManualGame(target.gameId)
      startRouteProgress()
      router.push(target.redirectTo ?? '/games')
    })
  }

  return { deleteGame, isPending }
}

export function DeleteGameButton(props: DeleteGameTarget) {
  const { deleteGame, isPending } = useDeleteGame(props)
  return (
    <button
      onClick={deleteGame}
      disabled={isPending}
      className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
    >
      {getStrings().gamePage.deleteGame}
    </button>
  )
}
