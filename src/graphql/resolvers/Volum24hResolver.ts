import { Arg, Query, Resolver } from 'type-graphql'
import { Volume24h } from 'graphql/schema'
import { Volume24hService } from 'services'

@Resolver((of) => Volume24h)
export class Recent24HResolver {
  constructor(private readonly volume24hService: Volume24hService) {}

  @Query((returns) => [Volume24h])
  async volume24hAll(): Promise<Volume24h[]> {
    return await this.volume24hService.getTokensInfo()
  }

  @Query((returns) => Volume24h)
  async terraswapDayData(@Arg('pairAddress') pairAddress: string): Promise<Volume24h> {
    const result = await this.volume24hService.getTokenInfo(pairAddress)
    if (!result) throw new Error('pair is not exist')
    return result
  }
}
