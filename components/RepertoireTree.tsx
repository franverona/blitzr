import { buildRepertoireIndex } from '@/lib/repertoire'
import type { RepertoireNode } from '@/lib/types'

function moveLabel(node: RepertoireNode): string {
  const moveNumber = Math.ceil(node.ply / 2)
  return node.ply % 2 === 1 ? `${moveNumber}. ${node.moveSan}` : `${moveNumber}… ${node.moveSan}`
}

export function RepertoireTree({
  nodes,
  currentPath,
  onSelectPath,
}: {
  nodes: RepertoireNode[]
  currentPath: RepertoireNode[]
  onSelectPath: (path: RepertoireNode[]) => void
}) {
  const index = buildRepertoireIndex(nodes)
  const roots = index.get(null) ?? []
  const currentIds = new Set(currentPath.map((n) => n.id))

  if (roots.length === 0) {
    return (
      <p className="text-sm text-zinc-500 lg:max-w-[280px]">
        No moves recorded yet — drag a piece on the board to start building this repertoire.
      </p>
    )
  }

  return (
    <div className="w-full overflow-y-auto rounded border border-zinc-800 bg-zinc-900 p-2 text-sm lg:max-h-[560px] lg:max-w-[280px]">
      {roots.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          ancestors={[]}
          index={index}
          currentIds={currentIds}
          onSelectPath={onSelectPath}
        />
      ))}
    </div>
  )
}

function TreeNode({
  node,
  ancestors,
  index,
  currentIds,
  onSelectPath,
}: {
  node: RepertoireNode
  ancestors: RepertoireNode[]
  index: Map<string | null, RepertoireNode[]>
  currentIds: Set<string>
  onSelectPath: (path: RepertoireNode[]) => void
}) {
  const path = [...ancestors, node]
  const children = index.get(node.id) ?? []
  const isActive = currentIds.has(node.id)

  return (
    <div style={{ paddingLeft: ancestors.length * 14 }}>
      <button
        onClick={() => onSelectPath(path)}
        className={`block w-full px-2 py-1 text-left ${
          isActive ? 'bg-[#769656]/50 font-medium text-white' : 'text-zinc-300 hover:bg-zinc-800'
        }`}
      >
        {moveLabel(node)}
      </button>
      {children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          ancestors={path}
          index={index}
          currentIds={currentIds}
          onSelectPath={onSelectPath}
        />
      ))}
    </div>
  )
}
