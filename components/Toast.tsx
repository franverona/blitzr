'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const TOAST_DURATION_MS = 4000

interface ToastState {
  isError: boolean
  durationMs?: number
}

/** Toast state that clears itself after `durationMs` (default 4s). */
export function useToast<T extends ToastState>() {
  const [toast, setToast] = useState<T | null>(null)
  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), toast.durationMs ?? TOAST_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [toast])
  return [toast, setToast] as const
}

/** Portals into the root layout's `#toasts` region, so toasts stack. Click dismisses. */
export function Toast({
  isError,
  onClose,
  children,
}: {
  isError: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return createPortal(
    <div
      role="status"
      onClick={onClose}
      className={`flex max-w-sm cursor-pointer flex-col items-start gap-2 rounded-md border px-4 py-2.5 text-sm shadow-lg ${
        isError
          ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
          : 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
      }`}
    >
      {children}
    </div>,
    document.getElementById('toasts')!,
  )
}
