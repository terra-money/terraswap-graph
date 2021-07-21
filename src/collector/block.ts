import { getRepository } from 'typeorm'
import { BlockEntity } from 'orm'
import config from 'config'

export async function getLastBlock(): Promise<BlockEntity | void> {
  return getRepository(BlockEntity).findOne({ order: { id: 'DESC' } })
}

export async function getCollectedBlock(): Promise<BlockEntity> {
  return (await getLastBlock()) || new BlockEntity({ height: config.START_BLOCK_HEIGHT })
}

export async function updateBlock(
  block: BlockEntity,
  height: number,
  repo = getRepository(BlockEntity)
): Promise<BlockEntity> {
  block.height = height
  return repo.save(block)
}
