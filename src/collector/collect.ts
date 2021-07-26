import { EntityManager, getManager } from 'typeorm'
import { delay } from 'bluebird'
import { getBlock, getLatestBlock, oracleExchangeRate } from 'lib/terra'
import { getCollectedBlock, updateBlock } from './block'
import { runIndexers } from './indexer'
import { delete24hData } from './deleteOldData'
import { BlockEntity } from '../orm'

export async function collect(): Promise<void> {
  const latestBlock = await getLatestBlock().catch(async (err) => {
    console.log(err)
  })

  if (!latestBlock) return

  const collectedBlock = await getCollectedBlock()

  const lastHeight = collectedBlock.height

  if (latestBlock === lastHeight) {
    await delay(500)
    return
  }

  for (let i = lastHeight + 1; i <= latestBlock; i += 100) {
    const endblock = i + 99 < latestBlock ? i + 99 : latestBlock

    const blocks = await getBlock(i, endblock).catch(async (err) => {
      console.log(err)
    })
    if (!blocks) return
    const exchangeRate = await oracleExchangeRate()

    await getManager().transaction(async (manager: EntityManager) => {
      console.log(i)
      for (const block of blocks) {
        if (block.Txs[0] != undefined) {
          await runIndexers(manager, block, exchangeRate)
          await updateBlock(collectedBlock, block.Txs[0].Height, manager.getRepository(BlockEntity))
        }
      }
      await delete24hData(manager, new Date().valueOf())
    })
  }
}
