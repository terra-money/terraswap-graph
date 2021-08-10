import { EntityManager } from 'typeorm'
import { mapSeries } from 'bluebird'
import { convertLegacyMantleEventsToNew } from '@terra-money/hive/compatibility/legacy-mantle'
import { Block } from 'types'
import { addTokenInfo, addPairInfo } from './createPairUpdater'
import { createCreatePairLogFinders } from '../log-finder'

const factoryAddress = 'terra1ulgw0td86nvs4wtpsc80thv6xelk76ut7a7apj'

export async function CreatePairIndexer(
  pairs: Record<string, boolean>,
  tokens: Record<string, boolean>,
  entityManager: EntityManager,
  block: Block
): Promise<void> {
  const logFinder = createCreatePairLogFinders(factoryAddress)
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

          await addTokenInfo(tokens, entityManager, transformed.assets[0], transformed.pairAddress)
          await addTokenInfo(tokens, entityManager, transformed.assets[1], transformed.pairAddress)
          await addPairInfo(pairs, entityManager, transformed)
        })
      })
    })
  })
}
