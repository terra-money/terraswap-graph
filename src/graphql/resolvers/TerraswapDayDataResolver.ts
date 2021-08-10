import { Arg, Query, Resolver } from 'type-graphql'
import { Service } from 'typedi'
import { TerraswapDay } from 'graphql/schema'
import { TerraswapService } from 'services'
import { rangeLimit } from 'lib/utils'
import { Cycle } from 'types'

@Service()
@Resolver((of) => TerraswapDay)
export class TerraswapDayDataResolver {
  constructor(private readonly terraswapServie: TerraswapService) {}

  @Query((returns) => [TerraswapDay])
  async terraswapDayData(
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number
  ): Promise<TerraswapDay[]> {
    rangeLimit(from, to, Cycle.DAY, 500)
    return this.terraswapServie.getTerraswapData(from, to)
  }
}
