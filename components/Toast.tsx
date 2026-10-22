'use client'

import { Toaster as HotToaster, resolveValue, toast } from 'react-hot-toast'

/** Mounted once in the root layout; anything calls `toast()` / `toast.error()`. Click dismisses. */
export function Toaster() {
  return (
    <HotToaster position="bottom-right" toastOptions={{ duration: 4000 }}>
      {(t) => (
        <div
          {...t.ariaProps}
          onClick={() => toast.dismiss(t.id)}
          className={`flex max-w-sm cursor-pointer flex-col items-start gap-2 rounded-md border px-4 py-2.5 text-sm shadow-lg transition-opacity ${
            t.visible ? 'opacity-100' : 'opacity-0'
          } ${
            t.type === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
              : 'border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
          }`}
        >
          {resolveValue(t.message, t)}
        </div>
      )}
    </HotToaster>
  )
}
