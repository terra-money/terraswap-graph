import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Container, Service } from 'typedi'
import { BlockEntity } from 'orm'

@Service()
export class BlockService {
  constructor(
    @InjectRepository(BlockEntity) private readonly repo: Repository<BlockEntity>,
  ) {}

  async getCollectedBlock(repo = this.repo): Promise<number> {
    return repo.findOne(undefined, { order: { id: 'DESC' } })
      .then((block) => block.height)
  }
}

export function blockService(): BlockService {
  return Container.get(BlockService)
}
