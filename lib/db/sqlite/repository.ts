import { Kysely } from 'kysely'
import type {
  DbSchema,
  DrillCardsTable,
  GameAnalysisTable,
  GameRepository,
  GamesTable,
  RepertoireMovesTable,
} from '../types'
import type {
  ArchiveSyncStatus,
  DrillCard,
  DrillSourceType,
  Game,
  GameAnalysis,
  RepertoireColor,
  RepertoireNode,
} from '../../types'
import { ensureSchema } from './migrate'

function rowToGame(row: GamesTable): Game {
  return {
    id: row.id,
    url: row.url,
    pgn: row.pgn,
    movesSan: row.moves_san ? JSON.parse(row.moves_san) : null,
    initialFen: row.initial_fen,
    finalFen: row.final_fen,
    timeControl: row.time_control,
    timeClass: row.time_class,
    rules: row.rules,
    rated: row.rated === 1,
    endTime: row.end_time,
    whiteUsername: row.white_username,
    whiteRating: row.white_rating,
    whiteResult: row.white_result,
    blackUsername: row.black_username,
    blackRating: row.black_rating,
    blackResult: row.black_result,
    myColor: row.my_color as Game['myColor'],
    myResult: row.my_result as Game['myResult'],
    ecoCode: row.eco_code,
    ecoName: row.eco_name,
    ecoUrl: row.eco_url,
    archiveYm: row.archive_ym,
    createdAt: row.created_at,
  }
}

function gameToRow(game: Game): GamesTable {
  return {
    id: game.id,
    url: game.url,
    pgn: game.pgn,
    moves_san: game.movesSan ? JSON.stringify(game.movesSan) : null,
    initial_fen: game.initialFen,
    final_fen: game.finalFen,
    time_control: game.timeControl,
    time_class: game.timeClass,
    rules: game.rules,
    rated: game.rated ? 1 : 0,
    end_time: game.endTime,
    white_username: game.whiteUsername,
    white_rating: game.whiteRating,
    white_result: game.whiteResult,
    black_username: game.blackUsername,
    black_rating: game.blackRating,
    black_result: game.blackResult,
    my_color: game.myColor,
    my_result: game.myResult,
    eco_code: game.ecoCode,
    eco_name: game.ecoName,
    eco_url: game.ecoUrl,
    archive_ym: game.archiveYm,
    created_at: game.createdAt,
  }
}

function rowToRepertoireNode(row: RepertoireMovesTable): RepertoireNode {
  return {
    id: row.id,
    color: row.color as RepertoireColor,
    parentId: row.parent_id,
    ply: row.ply,
    moveSan: row.move_san,
    fen: row.fen,
    createdAt: row.created_at,
  }
}

function rowToGameAnalysis(row: GameAnalysisTable): GameAnalysis {
  return {
    gameId: row.game_id,
    evals: JSON.parse(row.evals),
    analyzedAt: row.analyzed_at,
  }
}

function rowToDrillCard(row: DrillCardsTable): DrillCard {
  return {
    gameId: row.game_id,
    sourceType: row.source_type as DrillSourceType,
    ply: row.ply,
    dueAt: row.due_at,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    repetitions: row.repetitions,
    lastReviewedAt: row.last_reviewed_at,
    createdAt: row.created_at,
  }
}

function drillCardToRow(card: DrillCard): DrillCardsTable {
  return {
    game_id: card.gameId,
    source_type: card.sourceType,
    ply: card.ply,
    due_at: card.dueAt,
    interval_days: card.intervalDays,
    ease_factor: card.easeFactor,
    repetitions: card.repetitions,
    last_reviewed_at: card.lastReviewedAt,
    created_at: card.createdAt,
  }
}

export class SqliteGameRepository implements GameRepository {
  constructor(private readonly db: Kysely<DbSchema>) {}

  private async ready(): Promise<Kysely<DbSchema>> {
    await ensureSchema(this.db)
    return this.db
  }

  async upsertGames(games: Game[]): Promise<number> {
    if (games.length === 0) return 0
    const db = await this.ready()
    await db
      .insertInto('games')
      .values(games.map(gameToRow))
      .onConflict((oc) => oc.doNothing())
      .execute()
    return games.length
  }

  async listGames(
    params: { limit?: number; offset?: number } = {},
  ): Promise<{ games: Game[]; total: number }> {
    const db = await this.ready()
    const limit = params.limit ?? 50
    const offset = params.offset ?? 0

    const [rows, countRow] = await Promise.all([
      db
        .selectFrom('games')
        .selectAll()
        .orderBy('end_time', 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      db
        .selectFrom('games')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .executeTakeFirstOrThrow(),
    ])

    return { games: rows.map(rowToGame), total: Number(countRow.count) }
  }

  async listAllGames(): Promise<Game[]> {
    const db = await this.ready()
    const rows = await db.selectFrom('games').selectAll().execute()
    return rows.map(rowToGame)
  }

  async getGame(id: string): Promise<Game | undefined> {
    const db = await this.ready()
    const row = await db.selectFrom('games').selectAll().where('id', '=', id).executeTakeFirst()
    return row ? rowToGame(row) : undefined
  }

  async getArchiveSyncStatus(): Promise<ArchiveSyncStatus[]> {
    const db = await this.ready()
    const rows = await db.selectFrom('sync_state').selectAll().execute()
    return rows.map((r) => ({
      archiveYm: r.archive_ym,
      status: r.status as ArchiveSyncStatus['status'],
      gameCount: r.game_count,
      syncedAt: r.synced_at,
    }))
  }

  async markArchiveSynced(
    archiveYm: string,
    status: 'complete' | 'partial',
    gameCount: number,
  ): Promise<void> {
    const db = await this.ready()
    const syncedAt = new Date().toISOString()
    await db
      .insertInto('sync_state')
      .values({ archive_ym: archiveYm, status, game_count: gameCount, synced_at: syncedAt })
      .onConflict((oc) =>
        oc.column('archive_ym').doUpdateSet({ status, game_count: gameCount, synced_at: syncedAt }),
      )
      .execute()
  }

  async listRepertoireNodes(color: RepertoireColor): Promise<RepertoireNode[]> {
    const db = await this.ready()
    const rows = await db
      .selectFrom('repertoire_moves')
      .selectAll()
      .where('color', '=', color)
      .execute()
    return rows.map(rowToRepertoireNode)
  }

  async addRepertoireNode(node: RepertoireNode): Promise<void> {
    const db = await this.ready()
    const row: RepertoireMovesTable = {
      id: node.id,
      color: node.color,
      parent_id: node.parentId,
      ply: node.ply,
      move_san: node.moveSan,
      fen: node.fen,
      created_at: node.createdAt,
    }
    await db.insertInto('repertoire_moves').values(row).execute()
  }

  async deleteRepertoireNode(id: string): Promise<void> {
    const db = await this.ready()
    await db.deleteFrom('repertoire_moves').where('id', '=', id).execute()
  }

  async getGameAnalysis(gameId: string): Promise<GameAnalysis | undefined> {
    const db = await this.ready()
    const row = await db
      .selectFrom('game_analysis')
      .selectAll()
      .where('game_id', '=', gameId)
      .executeTakeFirst()
    return row ? rowToGameAnalysis(row) : undefined
  }

  async saveGameAnalysis(analysis: GameAnalysis): Promise<void> {
    const db = await this.ready()
    const row: GameAnalysisTable = {
      game_id: analysis.gameId,
      evals: JSON.stringify(analysis.evals),
      analyzed_at: analysis.analyzedAt,
    }
    await db
      .insertInto('game_analysis')
      .values(row)
      .onConflict((oc) =>
        oc.column('game_id').doUpdateSet({ evals: row.evals, analyzed_at: row.analyzed_at }),
      )
      .execute()
  }

  async listAllGameAnalyses(): Promise<GameAnalysis[]> {
    const db = await this.ready()
    const rows = await db.selectFrom('game_analysis').selectAll().execute()
    return rows.map(rowToGameAnalysis)
  }

  async listDrillCards(): Promise<DrillCard[]> {
    const db = await this.ready()
    const rows = await db.selectFrom('drill_cards').selectAll().execute()
    return rows.map(rowToDrillCard)
  }

  async upsertDrillCard(card: DrillCard): Promise<void> {
    const db = await this.ready()
    const row = drillCardToRow(card)
    await db
      .insertInto('drill_cards')
      .values(row)
      .onConflict((oc) =>
        oc.columns(['game_id', 'source_type', 'ply']).doUpdateSet({
          due_at: row.due_at,
          interval_days: row.interval_days,
          ease_factor: row.ease_factor,
          repetitions: row.repetitions,
          last_reviewed_at: row.last_reviewed_at,
        }),
      )
      .execute()
  }

  async deleteDrillCards(
    keys: { gameId: string; sourceType: DrillSourceType; ply: number }[],
  ): Promise<void> {
    if (keys.length === 0) return
    const db = await this.ready()
    for (const key of keys) {
      await db
        .deleteFrom('drill_cards')
        .where('game_id', '=', key.gameId)
        .where('source_type', '=', key.sourceType)
        .where('ply', '=', key.ply)
        .execute()
    }
  }
}
