import { Repository } from 'typeorm'
import { InjectRepository, Container } from 'typeorm-typedi-extensions'
import { Service } from 'typedi'
import { BlockEntity } from 'orm'

@Service()
export class BlockService {
  constructor(
    @InjectRepository(BlockEntity) private readonly repo: Repository<BlockEntity>,
  ) {}

  async getSyncedBlockHeight(repo = this.repo): Promise<number> {
    return repo.findOne(undefined, { order: { id: 'DESC' } })
      .then((block) => block.height)
  }
}

export function blockService(): BlockService {
  return Container.get(BlockService)
}
