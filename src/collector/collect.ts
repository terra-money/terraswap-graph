import { EntityManager, getManager } from 'typeorm'
import { delay } from 'bluebird'
import { getBlock, getLatestBlock, getOracleExchangeRate } from 'lib/terra'
import { errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { getCollectedBlock, updateBlock } from './block'
import { runIndexers } from './indexer'
import { delete24hData } from './deleteOldData'
import { BlockEntity } from '../orm'
import { updateTerraswapData } from './indexer/transferUpdater'

const columbus4EndHeight = 4_724_000

const chainId = process.env.TERRA_CHAIN_ID 

export async function collect(
  pairList: Record<string, boolean>,
  tokenList: Record<string, boolean>
): Promise<void> {
  //latest Height or end Height
  let latestBlock = await getLatestBlock().catch(errorHandler)

  if (!latestBlock) return

  if (chainId == 'columbus-4' && latestBlock > columbus4EndHeight){
    latestBlock = columbus4EndHeight
  }

  const collectedBlock = await getCollectedBlock()

  const lastHeight = collectedBlock.height

  if (latestBlock === lastHeight) {
    if (lastHeight == columbus4EndHeight) 
      throw new Error(`columbus-4 ended at height ${columbus4EndHeight}. Please change terraswap graph to the columbus-5 version`)

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
          await runIndexers(manager, block, exchangeRate, pairList, tokenList)
          await updateBlock(collectedBlock, block.Txs[0].Height, manager.getRepository(BlockEntity))
        }
      }
      await delete24hData(manager, new Date().valueOf())
      await updateTerraswapData(manager)
    })
    logger.info(`collected: ${endblock} / latest height: ${latestBlock}`)
  }
}
