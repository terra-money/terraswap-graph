import { Arg, Query, Resolver } from 'type-graphql'
import { PairData } from 'graphql/schema'
import { PairDataService } from 'services'
import { Cycle } from 'types'

@Resolver((of) => PairData)
export class PairDataResolver {
  constructor(private readonly pairDataService: PairDataService) {}

  @Query((returns) => PairData)
  async pairDayData(
    @Arg('pairAddress') pairAddress: string,
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number
  ): Promise<PairData> {
    const dayData = await this.pairDataService.getPairData(pairAddress, from, to, Cycle.day)
    if (!dayData) throw new Error('there are no transcation of this pair')
    return dayData
  }

  @Query((returns) => PairData)
  async pairHourData(
    @Arg('pairAddress') pairAddress: string,
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number
  ): Promise<PairData> {
    const hourData = await this.pairDataService.getPairData(pairAddress, from, to, Cycle.hour)
    if (!hourData) throw new Error('there are no transcation from this pair')
    return hourData
  }
}
