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
  const latestBlock = await getLatestBlock().catch(errorHandler)

  if (!latestBlock) return

  const collectedBlock = await getCollectedBlock()

  const lastHeight = collectedBlock.height


  if (chainId == 'columbus-4' || lastHeight < columbus4EndHeight){
    throw new Error (`this version is for the columbus-5, you have to collect columbus-4 data by using columbus-4 version of terraswap-graph first`)
  }

  // initial exchange rate
  let exchangeRate = await getOracleExchangeRate(lastHeight - (lastHeight % 100))

  if (latestBlock === lastHeight) {
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
