import { EntityManager } from 'typeorm'
import { mapSeries } from 'bluebird'
import { Tx, Cycle, ExchangeRate } from 'types'
import {
  updateTxns,
  updateVolume,
  addTxHistory,
  updateLpTokenShare,
  updateVolume24h,
} from './txHistoryUpdater'
import { createSPWFinder } from '../log-finder'

export async function TxHistoryIndexer(
  pairAddresses: Record<string, boolean>,
  entityManager: EntityManager,
  txs: Tx[],
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  const logFinder = createSPWFinder(pairAddresses)

  await mapSeries(txs, async (tx) => {
    const txHash = tx.txhash
    const timestamp = tx.timestamp
    await mapSeries(tx.logs, async (log) => {
      const events = log.events

      await mapSeries(events, async (event) => {
        if (event.attributes.length > 1800) return
        const logFounds = logFinder(event)

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
