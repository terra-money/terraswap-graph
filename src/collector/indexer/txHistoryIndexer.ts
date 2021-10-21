import { EntityManager } from 'typeorm'
import { mapSeries } from 'bluebird'
import { Cycle, ExchangeRate, TxHistoryTransformed } from 'types'
import {
  updateTxns,
  updateVolume,
  addTxHistory,
  updateLpTokenShare,
  updateVolume24h,
} from './txHistoryUpdater'
import { ReturningLogFinderResult } from '@terra-money/log-finder'

export async function TxHistoryIndexer(
  manager: EntityManager,
  exchangeRate: ExchangeRate | undefined,
  timestamp: string,
  txHash: string,
  founds: ReturningLogFinderResult<TxHistoryTransformed>[]
): Promise<void> {
  await mapSeries(founds, async (logFound) => {
    if (!logFound) return
    const transformed = logFound.transformed
    if (!transformed) return

    await updateTxns(timestamp, manager, transformed.pair) // +1 to txns for pair, terraswap
    if (transformed.action === 'swap') {
      updateVolume(manager, transformed, exchangeRate) // pair entity
      updateVolume24h(manager, transformed, timestamp, exchangeRate) // 24h entity
    } else {
      updateLpTokenShare(Cycle.DAY, manager, transformed)
      updateLpTokenShare(Cycle.HOUR, manager, transformed)
    }
    addTxHistory(manager, timestamp, txHash, transformed) // tx history entithy
  })
  
}
