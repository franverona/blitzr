'use client'

import { startTransition, useOptimistic } from 'react'
import { setGameFavorite } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { StarIcon } from './NavIcons'

/** A star toggle; the action's revalidation brings the real value back. */
export function FavoriteButton({
  gameId,
  favorite,
  className = '',
}: {
  gameId: string
  favorite: boolean
  className?: string
}) {
  const s = getStrings()
  const [starred, setStarred] = useOptimistic(favorite)
  const label = starred ? s.gameRow.removeFavorite : s.gameRow.addFavorite

  return (
    <button
      type="button"
      aria-pressed={starred}
      aria-label={label}
      title={label}
      onClick={() =>
        startTransition(async () => {
          setStarred(!starred)
          await setGameFavorite(gameId, !starred)
        })
      }
      className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-zinc-800 ${
        starred
          ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300'
          : 'text-zinc-500 hover:text-amber-500 dark:text-zinc-500 dark:hover:text-amber-400'
      } ${className}`}
    >
      <StarIcon className={`size-5 stroke-[2.5] ${starred ? 'fill-current' : ''}`} />
    </button>
  )
}
