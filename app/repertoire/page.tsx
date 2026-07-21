import Link from 'next/link'
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Repertoire</h1>
        <div className="flex gap-2 text-sm">
          <ColorTab color="white" active={color === 'white'} />
          <ColorTab color="black" active={color === 'black'} />
        </div>
      </div>
      <RepertoireBoard key={color} color={color} initialNodes={nodes} />
    </div>
  )
}

function ColorTab({ color, active }: { color: RepertoireColor; active: boolean }) {
  return (
    <Link
      href={`/repertoire?color=${color}`}
      className={`rounded-md border px-3 py-1 capitalize ${
        active
          ? 'border-[#769656] bg-[#769656]/20 text-white'
          : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
      }`}
    >
      {color}
    </Link>
  )
}
