import { EntityManager } from 'typeorm'
import { ReturningLogFinderMapper } from '@terra-money/log-finder'
import {
  Block,
  ExchangeRate,
  TxHistoryTransformed,
  NativeTransferTransformed,
  NonnativeTransferTransformed,
  createPairTransformed,
} from 'types'
import { CreatePairIndexer } from './createPairIndexer'
import { TxHistoryIndexer } from './txHistoryIndexer'
import { NonnativeTransferIndexer, NativeTransferIndexer } from './transferIndexer'
import { getPairList, getTokenList } from './common'

export async function runIndexers(
  manager: EntityManager,
  block: Block,
  exchangeRate: ExchangeRate | undefined,
  createCreatePairLogFinders: ReturningLogFinderMapper<createPairTransformed>,
  createTxHistoryFinders: ReturningLogFinderMapper<TxHistoryTransformed>[],
  createNativeTransferLogFinders: ReturningLogFinderMapper<NativeTransferTransformed[]>,
  createNonnativeTransferLogFinders: ReturningLogFinderMapper<NonnativeTransferTransformed>[]
): Promise<void> {
  await CreatePairIndexer(manager, block, createCreatePairLogFinders)
  const pairs = await getPairList(manager)
  const tokens = await getTokenList(manager)
  await TxHistoryIndexer(pairs, manager, block, exchangeRate, createTxHistoryFinders)
  await NativeTransferIndexer(pairs, manager, block, exchangeRate, createNativeTransferLogFinders)
  await NonnativeTransferIndexer(
    pairs,
    tokens,
    manager,
    block,
    exchangeRate,
    createNonnativeTransferLogFinders
  )
}
