'use server'

import { revalidatePath } from 'next/cache'
import { getRepository } from '@/lib/db'
import { buildOpeningFamilies } from '@/lib/openings'
import { syncAllArchives } from '@/lib/sync'
import type {
  ArchiveSyncStatus,
  Game,
  OpeningFamily,
  RepertoireColor,
  RepertoireNode,
  SyncResult,
} from '@/lib/types'

export async function listGames(
  params: { limit?: number; offset?: number } = {},
): Promise<{ games: Game[]; total: number }> {
  return getRepository().listGames(params)
}

export async function getGame(id: string): Promise<Game | undefined> {
  return getRepository().getGame(id)
}

export async function listOpenings(): Promise<OpeningFamily[]> {
  const games = await getRepository().listAllGames()
  return buildOpeningFamilies(games)
}

export async function getArchiveSyncStatus(): Promise<ArchiveSyncStatus[]> {
  return getRepository().getArchiveSyncStatus()
}

export async function syncGames(): Promise<SyncResult> {
  const result = await syncAllArchives()
  revalidatePath('/')
  revalidatePath('/openings')
  return result
}

export async function listRepertoire(color: RepertoireColor): Promise<RepertoireNode[]> {
  return getRepository().listRepertoireNodes(color)
}

export async function addRepertoireMove(node: RepertoireNode): Promise<void> {
  await getRepository().addRepertoireNode(node)
  revalidatePath('/repertoire')
}

export async function deleteRepertoireMove(id: string): Promise<void> {
  await getRepository().deleteRepertoireNode(id)
  revalidatePath('/repertoire')
}
