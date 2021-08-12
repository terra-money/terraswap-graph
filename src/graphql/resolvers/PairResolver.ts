import { Query, Resolver } from 'type-graphql'
import { Service } from 'typedi'
import { Pair } from 'graphql/schema'
import { PairService } from 'services'

@Service()
@Resolver((of) => Pair)
export class PairResolver {
  constructor(private readonly pairService: PairService) {}

  @Query((returns) => [Pair])
  async pairList(): Promise<Pair[]> {
    return this.pairService.getPairList()
  }
}
