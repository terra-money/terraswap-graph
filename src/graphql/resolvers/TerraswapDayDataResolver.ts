import { Arg, Query, Resolver } from 'type-graphql'
import { TerraswapDay } from 'graphql/schema'
import { TerraswapService } from 'services'

@Resolver((of) => TerraswapDay)
export class TerraswapDayDataResolver {
  constructor(private readonly terraswapServie: TerraswapService) {}

  @Query((returns) => [TerraswapDay])
  async terraswapDayData(
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number
  ): Promise<TerraswapDay[]> {
    return await this.terraswapServie.getTerraswapData()
  }
}
