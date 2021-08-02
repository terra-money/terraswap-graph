import { EntityManager, getManager } from 'typeorm'
import { delay } from 'bluebird'
import { ReturningLogFinderMapper } from '@terra-money/log-finder'
import {
  TxHistoryTransformed,
  NativeTransferTransformed,
  NonnativeTransferTransformed,
  createPairTransformed,
} from 'types'
import { getBlock, getLatestBlock, oracleExchangeRate } from 'lib/terra'
import { errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { getCollectedBlock, updateBlock } from './block'
import { runIndexers } from './indexer'
import { delete24hData } from './deleteOldData'
import { BlockEntity } from '../orm'

export async function collect(
  createCreatePairLogFinders: ReturningLogFinderMapper<createPairTransformed>,
  createTxHistoryFinders: ReturningLogFinderMapper<TxHistoryTransformed>[],
  createNativeTransferLogFinders: ReturningLogFinderMapper<NativeTransferTransformed[]>,
  createNonnativeTransferLogFinders: ReturningLogFinderMapper<NonnativeTransferTransformed>[]
): Promise<void> {
  const latestBlock = await getLatestBlock().catch(errorHandler)

  if (!latestBlock) return

  const collectedBlock = await getCollectedBlock()

  const lastHeight = collectedBlock.height

  if (latestBlock === lastHeight) {
    await delay(500)
    return
  }

  const blockCounts = 100

  for (let i = lastHeight + 1; i <= latestBlock; i += blockCounts) {
    const endblock = i + blockCounts - 1 < latestBlock ? i + blockCounts - 1 : latestBlock
    const blocks = await getBlock(i, endblock, blockCounts).catch(errorHandler)
    if (!blocks) return

    const exchangeRate = await oracleExchangeRate(endblock - (endblock % 100)).catch(errorHandler)

    if (!exchangeRate) return

    await getManager().transaction(async (manager: EntityManager) => {
      logger.info(i)
      for (const block of blocks) {
        if (block.Txs[0] != undefined) {
          await runIndexers(
            manager,
            block,
            exchangeRate,
            createCreatePairLogFinders,
            createTxHistoryFinders,
            createNativeTransferLogFinders,
            createNonnativeTransferLogFinders
          )
          await updateBlock(collectedBlock, block.Txs[0].Height, manager.getRepository(BlockEntity))
        }
      }
      await delete24hData(manager, new Date().valueOf())
    })
    await delay(50)
  }
}
