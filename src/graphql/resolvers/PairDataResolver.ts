import { Arg, Query, Resolver } from 'type-graphql'
import { Service } from 'typedi'
import { PairData } from 'graphql/schema'
import { PairDataService } from 'services'
import { Cycle } from 'types'
import { rangeLimit } from 'lib/utils'

@Service()
@Resolver((of) => PairData)
export class PairDataResolver {
  constructor(private readonly pairDataService: PairDataService) {}

  @Query((returns) => PairData)
  async pairDayData(
    @Arg('pairAddress') pairAddress: string,
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number
  ): Promise<PairData> {
    rangeLimit(from, to, 1, Cycle.DAY, 500)
    const dayData = await this.pairDataService.getPairData(pairAddress, from, to, Cycle.DAY)
    if (!dayData) throw new Error('there are no transactions of this pair')
    return dayData
  }

  @Query((returns) => PairData)
  async pairHourData(
    @Arg('pairAddress') pairAddress: string,
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number
  ): Promise<PairData> {
    rangeLimit(from, to, 1, Cycle.HOUR, 500)
    const hourData = await this.pairDataService.getPairData(pairAddress, from, to, Cycle.HOUR)
    if (!hourData) throw new Error('there are no transactions from this pair')
    return hourData
  }
}
