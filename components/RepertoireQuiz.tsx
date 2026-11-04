'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { getStrings } from '@/lib/i18n/strings'
import { START_FEN } from '@/lib/positions'
import { repertoireLines } from '@/lib/repertoire'
import type { RepertoireColor, RepertoireNode } from '@/lib/types'
import { BoardProvider } from './BoardContext'
import { LessonQuiz } from './LessonQuiz'
import { PageHeader } from './PageHeader'
import { buttonClass, chipClass } from './styles'

function randomIndex(n: number, not?: number): number {
  if (n <= 1) return 0
  let i = Math.floor(Math.random() * n)
  if (i === not) i = (i + 1) % n
  return i
}

/** Plays one root-to-leaf line of the tree from memory, a different one on each "Next line". */
export function RepertoireQuiz({
  color,
  nodes,
}: {
  color: RepertoireColor
  nodes: RepertoireNode[]
}) {
  const s = getStrings()
  const lines = useMemo(() => repertoireLines(nodes, color), [nodes, color])
  // The first line in tree order: a random start would differ between the server and hydration.
  const [lineIndex, setLineIndex] = useState(0)
  // Bumped on every "Next line", so the quiz resets even if it draws the same line.
  const [run, setRun] = useState(0)
  const line = lines[lineIndex]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={s.repertoire.title}
        subtitle={line ? s.repertoire.quizLine(lineIndex + 1, lines.length) : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              onClick={() => {
                setLineIndex((i) => randomIndex(lines.length, i))
                setRun((r) => r + 1)
              }}
              disabled={lines.length < 2}
              className={buttonClass()}
            >
              {s.repertoire.nextLine}
            </button>
            <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            <ModeTabs color={color} quiz />
            <Link
              href={`/repertoire?color=white&mode=quiz`}
              className={chipClass(color === 'white')}
            >
              {s.common.color.white}
            </Link>
            <Link
              href={`/repertoire?color=black&mode=quiz`}
              className={chipClass(color === 'black')}
            >
              {s.common.color.black}
            </Link>
          </div>
        }
      />
      {line ? (
        <BoardProvider
          key={run}
          initialFen={START_FEN}
          movesSan={line}
          boardOrientation={color}
          myColor={color}
          initialPly={0}
        >
          <LessonQuiz />
        </BoardProvider>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.repertoire.noLinesToQuiz}</p>
      )}
    </div>
  )
}

/** Build/Quiz links for the repertoire page; `?mode=quiz` picks the quiz. */
export function ModeTabs({ color, quiz }: { color: RepertoireColor; quiz: boolean }) {
  const s = getStrings()
  return (
    <>
      <Link href={`/repertoire?color=${color}`} className={chipClass(!quiz)}>
        {s.repertoire.build}
      </Link>
      <Link href={`/repertoire?color=${color}&mode=quiz`} className={chipClass(quiz)}>
        {s.repertoire.quiz}
      </Link>
    </>
  )
}
