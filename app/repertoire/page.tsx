import { listRepertoire } from '../actions'
import { RepertoireBoard } from '@/components/RepertoireBoard'
import type { RepertoireColor } from '@/lib/types'

export default async function RepertoirePage({
  searchParams,
}: {
  searchParams: Promise<{ color?: string }>
}) {
  const { color: colorParam } = await searchParams
  const color: RepertoireColor = colorParam === 'black' ? 'black' : 'white'
  const nodes = await listRepertoire(color)

  return <RepertoireBoard key={color} color={color} initialNodes={nodes} />
}
