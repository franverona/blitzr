import { notFound } from 'next/navigation'
import { getLessonGameStats } from '@/app/actions'
import { LessonPractice } from '@/components/LessonPractice'
import { getEndgameLesson } from '@/lib/endgameTheory'
import { getOpeningLesson } from '@/lib/openingTheory'

export default async function LearnLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const openingLesson = getOpeningLesson(slug)
  const lesson = openingLesson ?? getEndgameLesson(slug)
  if (!lesson) notFound()

  // Opening lessons only; null hides the section.
  const gameStats = openingLesson
    ? await getLessonGameStats(openingLesson.moves.map((move) => move.san))
    : null

  return <LessonPractice lesson={lesson} gameStats={gameStats} />
}
