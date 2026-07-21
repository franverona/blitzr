'use client'

import { useRouter } from 'next/navigation'

// router.back() (not a plain Link to "/") so this returns to wherever the
// user actually came from — including whatever page of the paginated games
// list they were on, rather than always resetting to page 1.
export function BackButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-300">
      ← Back to games
    </button>
  )
}
