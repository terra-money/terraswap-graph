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

  if (chainId == 'columbus-4'){
    latestBlock = columbus4EndHeight
  }

  const collectedBlock = await getCollectedBlock()

  const lastHeight = collectedBlock.height

  // initial exchange rate
  let exchangeRate = await getOracleExchangeRate(lastHeight - (lastHeight % 100))

  if (latestBlock === lastHeight) {
    lastHeight == columbus4EndHeight 
     && logger.info(`columbus-4 ended at height ${columbus4EndHeight}. Please change your environment chain id to columbus-5`)
    await delay(500)
    return
  }
  for (let height = lastHeight + 1; height <= latestBlock; height ++) {
    const block = await getBlock(height).catch(errorHandler)
    if (!block) return

    if (height % 100 == 0){
      exchangeRate = await getOracleExchangeRate(height)
    }

    await getManager().transaction(async (manager: EntityManager) => {
      if (!(latestBlock === lastHeight && block[0] === undefined)) {
        if(block[0] !== undefined){
          await runIndexers(manager, block, exchangeRate, pairList, tokenList)
          await updateTerraswapData(manager)
        }
        await updateBlock(collectedBlock, height, manager.getRepository(BlockEntity))
      }
      await delete24hData(manager, new Date().valueOf())
    })
    if (height % 100 == 0) logger.info(`collected: ${height} / latest height: ${latestBlock}`)
  }
}
