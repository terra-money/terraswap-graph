import { EntityManager } from 'typeorm'
import { mapSeries } from 'bluebird'
import { convertLegacyMantleEventsToNew } from '@terra-money/hive/compatibility/legacy-mantle'
import { Block, Cycle, ExchangeRate } from 'types'
import {
  updateTxns,
  updateVolume,
  addTxHistory,
  updateLpTokenShare,
  updateVolume24h,
} from './txHistoryUpdater'
import { createSPWFinder } from '../log-finder'

export async function TxHistoryIndexer(
  pairAddresses: string[],
  entityManager: EntityManager,
  block: Block,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  const logFinder = createSPWFinder(pairAddresses)
  const Txs = block.Txs
  await mapSeries(Txs, async (tx) => {
    const txHash = tx.TxHash
    const Logs = tx.Logs
    const timestamp = tx.TimestampUTC
    await mapSeries(Logs, async (log) => {
      const events = log.Events

      await mapSeries(events, async (event) => {
        if (event.Attributes.length > 1800) return
        const logFounds = logFinder(convertLegacyMantleEventsToNew(event))

        await mapSeries(logFounds, async (logFound) => {
          if (!logFound) return
          const transformed = logFound.transformed
          if (!transformed) return

          await updateTxns(timestamp, entityManager, transformed.pair) // +1 to txns for pair, terraswap
          if (transformed.action === 'swap') {
            await updateVolume(entityManager, transformed, exchangeRate)
            await updateVolume24h(entityManager, transformed, timestamp, exchangeRate)
          } else {
            await updateLpTokenShare(Cycle.DAY, entityManager, transformed)
            await updateLpTokenShare(Cycle.HOUR, entityManager, transformed)
          }
          await addTxHistory(entityManager, timestamp, txHash, transformed)
        })
      })
    })
  })
}
