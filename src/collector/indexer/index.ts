import { EntityManager } from 'typeorm'
import { Block, ExchangeRate } from 'types'
import { CreatePairIndexer } from './createPairIndexer'
import { TxHistoryIndexer } from './txHistoryIndexer'
import { NonnativeTransferIndexer, NativeTransferIndexer } from './transferIndex'
import { getPairList, getTokenList } from './common'

export async function runIndexers(
  manager: EntityManager,
  block: Block,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  await CreatePairIndexer(manager, block)
  const pairs = await getPairList(manager)
  const tokens = await getTokenList(manager)
  await TxHistoryIndexer(pairs, manager, block, exchangeRate)
  await NativeTransferIndexer(pairs, manager, block, exchangeRate)
  await NonnativeTransferIndexer(pairs, tokens, manager, block, exchangeRate)
}
