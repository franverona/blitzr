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

  // Cross-links the lesson to the account's own data: how many synced games
  // actually reached this exact move sequence (see LessonGameStats, lib/types.ts,
  // for why this matches on moves played rather than Chess.com's ECO code/name).
  // Opening-specific — an endgame lesson has no equivalent, so gameStats stays
  // null and LessonPractice skips that section entirely.
  const gameStats = openingLesson
    ? await getLessonGameStats(openingLesson.moves.map((move) => move.san))
    : null

  return <LessonPractice lesson={lesson} gameStats={gameStats} />
}
