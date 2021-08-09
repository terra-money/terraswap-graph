import { EntityManager, getManager } from 'typeorm'
import { delay } from 'bluebird'
import { getBlock, getLatestBlock, getOracleExchangeRate } from 'lib/terra'
import { errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { getCollectedBlock, updateBlock } from './block'
import { runIndexers } from './indexer'
import { delete24hData } from './deleteOldData'
import { BlockEntity } from '../orm'
import { updateTotalLiquidity } from './indexer/transferUpdater'

export async function collect(): Promise<void> {
  const latestBlock = await getLatestBlock().catch(errorHandler)

  if (!latestBlock) return

  const collectedBlock = await getCollectedBlock()

  const lastHeight = collectedBlock.height

  const exManager = getManager()
  if (latestBlock === lastHeight) {
    await delay(500)
    return
  }

  const blockCounts = 100

  for (let i = lastHeight + 1; i <= latestBlock; i += blockCounts) {
    const endblock = i + blockCounts - 1 < latestBlock ? i + blockCounts - 1 : latestBlock
    const blocks = await getBlock(i, endblock, blockCounts).catch(errorHandler)
    if (!blocks) return

    const exchangeRate = await getOracleExchangeRate(endblock - (endblock % 100)).catch(
      errorHandler
    )

    if (!exchangeRate) return

    await getManager().transaction(async (manager: EntityManager) => {
      for (const block of blocks) {
        if (block.Txs[0] != undefined) {
          await runIndexers(manager, block, exchangeRate)
          await updateBlock(collectedBlock, block.Txs[0].Height, manager.getRepository(BlockEntity))
        }
      }
      await delete24hData(manager, new Date().valueOf())
    })
    logger.info(`collected: ${endblock} / latest height: ${latestBlock}`)
    await updateTotalLiquidity(exManager)
  }
}
