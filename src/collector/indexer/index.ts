import { EntityManager } from 'typeorm'
import { Block, ExchangeRate } from 'types'
import { CreatePairIndexer } from './createPairIndexer'
import { TxHistoryIndexer } from './txHistoryIndexer'
import { NonnativeTransferIndexer, NativeTransferIndexer } from './transferIndexer'

export async function runIndexers(
  manager: EntityManager,
  block: Block,
  exchangeRate: ExchangeRate | undefined,
  pairList: Record<string, boolean>,
  tokenList: Record<string, boolean>
): Promise<void> {
  await CreatePairIndexer(pairList, tokenList, manager, block)
  await TxHistoryIndexer(pairList, manager, block, exchangeRate)
  await NativeTransferIndexer(pairList, manager, block, exchangeRate)
  await NonnativeTransferIndexer(pairList, tokenList, manager, block, exchangeRate)
}
