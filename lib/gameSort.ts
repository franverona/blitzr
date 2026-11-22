import type { GameAccuracy } from './types'

export const GAME_SORTS = ['date', 'rating', 'accuracy', 'errors'] as const
export type GameSort = (typeof GAME_SORTS)[number]
export type SortDir = 'asc' | 'desc'

/** The games list's sort from the URL; anything unknown falls back to newest first. */
export function parseGameSort(
  sort: string | undefined,
  dir: string | undefined,
): { sort: GameSort; dir: SortDir } {
  return {
    sort: GAME_SORTS.find((s) => s === sort) ?? 'date',
    dir: dir === 'asc' ? 'asc' : 'desc',
  }
}

/** Orders ids by accuracy, or by errors (blunders, then mistakes). Ties keep their input order,
 *  and unanalyzed games (absent from the map) go last in either direction. */
export function sortIdsByAccuracy(
  ids: string[],
  accuracyById: Record<string, GameAccuracy>,
  sort: 'accuracy' | 'errors',
  dir: SortDir,
): string[] {
  const sign = dir === 'asc' ? 1 : -1
  const analyzed = ids.filter((id) => accuracyById[id])
  const unanalyzed = ids.filter((id) => !accuracyById[id])
  analyzed.sort((a, b) => {
    const x = accuracyById[a]
    const y = accuracyById[b]
    const diff =
      sort === 'accuracy'
        ? x.accuracy - y.accuracy
        : x.blunders - y.blunders || x.mistakes - y.mistakes
    return sign * diff
  })
  return [...analyzed, ...unanalyzed]
}
