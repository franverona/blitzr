import { notFound } from 'next/navigation'
import { getLessonGameStats } from '@/app/actions'
import { LessonPractice } from '@/components/LessonPractice'
import { getOpeningLesson } from '@/lib/openingTheory'

export default async function LearnLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lesson = getOpeningLesson(slug)
  if (!lesson) notFound()

  // Cross-links the lesson to the account's own data: how many synced games
  // actually reached this exact move sequence (see LessonGameStats, lib/types.ts,
  // for why this matches on moves played rather than Chess.com's ECO code/name).
  const gameStats = await getLessonGameStats(lesson.moves.map((move) => move.san))

  return <LessonPractice lesson={lesson} gameStats={gameStats} />
}
