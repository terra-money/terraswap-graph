import { Arg, FieldResolver, Query, Resolver, Root } from 'type-graphql'
import { Service } from 'typedi'
import { PairData, PairHistoricalData } from 'graphql/schema'
import { PairDataService } from 'services'
import { Cycle, Interval } from 'types'
import { rangeLimit } from 'lib/utils'

@Service()
@Resolver((of) => PairData)
export class PairDataResolver {
  constructor(private readonly pairDataService: PairDataService) {}

  @Query((returns) => PairData)
  async pairData(@Arg('pairAddress') pairAddress: string): Promise<PairData> {
    const pairData = await this.pairDataService.getPairData(pairAddress)
    if (!pairData) throw new Error('there are no transactions of this pair')
    return pairData as PairData
  }

  @FieldResolver((type) => [PairHistoricalData])
  async historicalData(
    @Root() pairData: PairData,
    @Arg('interval', (type) => Interval, { description: 'day or hour' }) interval: Interval,
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number
  ): Promise<PairHistoricalData[]> {
    const cycle = interval == Interval.DAY ? Cycle.DAY : Cycle.HOUR
    rangeLimit(from, to, cycle, 500)
    const pair = pairData.pairAddress
    const data = await this.pairDataService.getHistoricalData(pair, from, to, cycle)
    if (!data) throw new Error('there are no transactions of this pair')
    return data
  }
}
