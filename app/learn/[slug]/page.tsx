import { notFound } from 'next/navigation'
import { AboutOpeningButton } from '@/components/AboutOpeningButton'
import { BoardNavControls, BoardProvider, BoardView } from '@/components/Board'
import { FlipBoardButton } from '@/components/FlipBoardButton'
import { MoveExplanation } from '@/components/MoveExplanation'
import { getOpeningLesson } from '@/lib/openingTheory'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default async function LearnLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lesson = getOpeningLesson(slug)
  if (!lesson) notFound()

  return (
    <BoardProvider
      key={lesson.slug}
      initialFen={START_FEN}
      movesSan={lesson.moves.map((move) => move.san)}
      boardOrientation="white"
      initialPly={1}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{lesson.name}</h1>
          <div className="flex items-center gap-2">
            <BoardNavControls />
            <FlipBoardButton />
            <AboutOpeningButton
              name={lesson.name}
              summary={lesson.summary}
              sourceUrl={lesson.sourceUrl}
            />
          </div>
        </div>
        <MoveExplanation moves={lesson.moves} />
        <BoardView boardMaxWidthClassName="max-w-172" />
      </div>
    </BoardProvider>
  )
}
