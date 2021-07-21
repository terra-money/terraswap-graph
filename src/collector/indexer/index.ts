import { EntityManager } from 'typeorm'
import { Block } from 'types'
import { CreatePairIndexer } from './createPairIndexer'
import { TxHistoryIndexer } from './txHistoryIndexer'
import { NonnativeTransferIndexer, NativeTransferIndexer } from './TransferIndex'
import { getPairList, getTokenList } from './common'

export async function runIndexers(manager: EntityManager, block: Block): Promise<void> {
  await CreatePairIndexer(manager, block)
  const pairs = await getPairList(manager)
  const tokens = await getTokenList(manager)
  await TxHistoryIndexer(pairs, manager, block)
  await NativeTransferIndexer(pairs, manager, block)
  await NonnativeTransferIndexer(pairs, tokens, manager, block)
}
