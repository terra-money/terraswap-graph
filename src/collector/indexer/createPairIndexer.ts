import { EntityManager } from 'typeorm'
import { mapSeries } from 'bluebird'
import { convertLegacyMantleEventsToNew } from '@terra-money/hive/compatibility/legacy-mantle'
import { Block, createPairTransformed } from 'types'
import { addTokenInfo, addPairInfo } from './createPairUpdater'
import { ReturningLogFinderMapper } from '@terra-money/log-finder'

export async function CreatePairIndexer(
  entityManager: EntityManager,
  block: Block,
  logFinder: ReturningLogFinderMapper<createPairTransformed>
): Promise<void> {
  const Txs = block.Txs
  await mapSeries(Txs, async (tx) => {
    const Logs = tx.Logs

    await mapSeries(Logs, async (log) => {
      const events = log.Events

      await mapSeries(events, async (event) => {
        if (event.Attributes.length > 1800) return
        const logFounds = logFinder(convertLegacyMantleEventsToNew(event))

        await mapSeries(logFounds, async (logFound) => {
          if (!logFound) return

          const transformed = logFound.transformed

          if (!transformed) return

          await addTokenInfo(entityManager, transformed.assets[0], transformed.pairAddress)
          await addTokenInfo(entityManager, transformed.assets[1], transformed.pairAddress)
          await addPairInfo(entityManager, transformed)
        })
      })
    })
  })
}
