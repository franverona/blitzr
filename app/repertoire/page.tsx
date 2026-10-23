import { getRepertoireGaps, listRepertoire } from '../actions'
import { RepertoireBoard } from '@/components/RepertoireBoard'
import type { RepertoireColor } from '@/lib/types'

export default async function RepertoirePage({
  searchParams,
}: {
  searchParams: Promise<{ color?: string }>
}) {
  const { color: colorParam } = await searchParams
  const color: RepertoireColor = colorParam === 'black' ? 'black' : 'white'
  const [nodes, gaps] = await Promise.all([listRepertoire(color), getRepertoireGaps(color)])

  // `gaps` stays out of the key: adding a move revalidates the page and re-sends them.
  return <RepertoireBoard key={color} color={color} initialNodes={nodes} gaps={gaps} />
}
