import { notFound } from 'next/navigation'
import { LessonPractice } from '@/components/LessonPractice'
import { getOpeningLesson } from '@/lib/openingTheory'

export default async function LearnLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lesson = getOpeningLesson(slug)
  if (!lesson) notFound()

  return <LessonPractice lesson={lesson} />
}
