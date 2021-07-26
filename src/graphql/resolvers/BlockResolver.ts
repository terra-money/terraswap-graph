import { Resolver, Query, Int } from 'type-graphql'
import { Block } from 'graphql/schema'
import { BlockService } from 'services'
import { Service } from 'typedi'

@Service()
@Resolver((of) => Block)
export class BlockResolver {
  constructor(private readonly blockService: BlockService) {}

  @Query((returns) => Int, { nullable: true })
  async collectedBlock(): Promise<number> {
    return this.blockService.getCollectedBlock()
  }
}
