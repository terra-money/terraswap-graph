import { EntityManager } from 'typeorm'
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
  for(const logFound of founds) {
    const transformed = logFound.transformed
    if (transformed){
      await updateTxns(timestamp, manager, transformed.pair) // +1 to txns for pair, terraswap
      if (transformed.action === 'swap') {
        await updateVolume(manager, transformed, exchangeRate) // pair entity
        await updateVolume24h(manager, transformed, timestamp, exchangeRate) // 24h entity
      } else {
        await updateLpTokenShare(Cycle.DAY, manager, transformed)
        await updateLpTokenShare(Cycle.HOUR, manager, transformed)
      }
      await addTxHistory(manager, timestamp, txHash, transformed) // tx history entithy
    }
  }
  
}
