import { Arg, FieldResolver, Query, Resolver, Root } from 'type-graphql'
import { Service } from 'typedi'
import { TerraswapData, TerraswapHistoricalData } from 'graphql/schema'
import { TerraswapService } from 'services'
import { floorDate, rangeLimit } from 'lib/utils'
import { Cycle } from 'types'

@Service()
@Resolver((of) => TerraswapData)
export class TerraswapDayDataResolver {
  constructor(private readonly terraswapServie: TerraswapService) {}

  @Query((returns) => TerraswapData)
  async terraswap(): Promise<Partial<TerraswapData>> {
    const terraswapData = await this.terraswapServie.getTerraswap()
    return terraswapData as TerraswapData
  }

  @FieldResolver((type) => [TerraswapHistoricalData])
  async historicalData(
    @Root() terraswapData: TerraswapData,
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number
  ): Promise<TerraswapHistoricalData[]> {
    from = floorDate(from, Cycle.DAY)
    to = floorDate(to, Cycle.DAY)
    rangeLimit(from, to, Cycle.DAY, 500)

    return this.terraswapServie.getTerraswapHistoricalData(from, to)
  }
}
