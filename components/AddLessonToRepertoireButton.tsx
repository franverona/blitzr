'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { addLessonToRepertoire } from '@/app/actions'
import { getStrings } from '@/lib/i18n/strings'
import { buttonClass } from './styles'

const TOAST_ID = 'add-lesson-to-repertoire'

/** Adds an opening lesson's line to the repertoire of the lesson's color. */
export function AddLessonToRepertoireButton({
  slug,
  color,
}: {
  slug: string
  color: 'white' | 'black'
}) {
  const [saving, setSaving] = useState(false)
  const s = getStrings()

  async function handleClick() {
    setSaving(true)
    const result = await addLessonToRepertoire(slug).catch(() => null)
    setSaving(false)
    if (!result?.ok) {
      toast.error(result?.error ?? s.repertoire.failedToSave, { id: TOAST_ID })
    } else {
      toast(s.lessonPractice.addedToRepertoire(result.added, color), { id: TOAST_ID })
    }
  }

  return (
    <button onClick={handleClick} disabled={saving} className={buttonClass({ size: 'sm' })}>
      {s.lessonPractice.addToRepertoire}
    </button>
  )
}
