import { EntityManager } from 'typeorm'
import { Recent24hEntity } from 'orm'

export async function delete24hData(manager: EntityManager, timestamp: number): Promise<void> {
  await manager
    .createQueryBuilder()
    .delete()
    .from(Recent24hEntity, 'recent_24h')
    .where('recent_24h.timestamp < :timestamp', { timestamp: new Date(timestamp - 86400000) })
    .execute()
}
