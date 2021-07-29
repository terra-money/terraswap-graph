import { Arg, Query, Resolver } from 'type-graphql'
import { Service } from 'typedi'
import { Pair } from 'graphql/schema'
import { PairService } from 'services'

@Service()
@Resolver((of) => Pair)
export class PairResolver {
  constructor(private readonly pairService: PairService) {}

  @Query((returns) => Pair)
  async pairInfo(@Arg('pairAddress') pairAddress: string): Promise<Pair> {
    return this.pairService.getPairInfo(pairAddress)
  }

  @Query((returns) => [Pair])
  async pairInfos(): Promise<Pair[]> {
    return this.pairService.getPairInfos()
  }
}
