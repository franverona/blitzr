import { getStrings } from '@/lib/i18n/strings'
import { buildRepertoireIndex } from '@/lib/repertoire'
import { plyLabel } from '@/lib/san'
import type { RepertoireNode } from '@/lib/types'
import { PieceMoveLabel } from './PieceMoveLabel'

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
      <p className="text-sm text-zinc-600 lg:max-w-xs lg:flex-1 dark:text-zinc-500">
        {getStrings().repertoire.noMovesYet}
      </p>
    )
  }

  return (
    <div className="w-full overflow-y-auto rounded border border-zinc-300 bg-white py-2 text-sm shadow-sm lg:max-h-160 lg:max-w-xs lg:flex-1 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
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
          isActive
            ? 'bg-accent/50 font-medium text-zinc-900 dark:text-white'
            : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
        }`}
      >
        <span className="mr-1 text-zinc-600 dark:text-zinc-500">{plyLabel(node.ply)}</span>
        <PieceMoveLabel san={node.moveSan} />
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
