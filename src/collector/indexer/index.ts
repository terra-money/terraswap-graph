import { EntityManager } from 'typeorm'
import { Tx, ExchangeRate } from 'types'
import { CreatePairIndexer } from './createPairIndexer'
import { TxHistoryIndexer } from './txHistoryIndexer'
import { NonnativeTransferIndexer, NativeTransferIndexer } from './transferIndexer'
import { generateTerraswapRow } from './txHistoryUpdater'

export async function runIndexers(
  manager: EntityManager,
  txs: Tx[],
  exchangeRate: ExchangeRate | undefined,
  pairList: Record<string, boolean>,
  tokenList: Record<string, boolean>
): Promise<void> {
  await CreatePairIndexer(pairList, tokenList, manager, txs)
  await TxHistoryIndexer(pairList, manager, txs, exchangeRate)
  await NativeTransferIndexer(pairList, manager, txs, exchangeRate)
  await NonnativeTransferIndexer(pairList, tokenList, manager, txs, exchangeRate)
  if (txs[0]) {
    generateTerraswapRow(txs[0].timestamp, manager)
  }
}
