import { Arg, FieldResolver, Query, Resolver, Root } from 'type-graphql'
import { Service } from 'typedi'
import { PairData, PairHistoricalData, Volume24h } from 'graphql/schema'
import { PairDataService, Volume24hService } from 'services'
import { Cycle, Interval } from 'types'
import { rangeLimit } from 'lib/utils'

@Service()
@Resolver((of) => PairData)
export class PairDataResolver {
  constructor(
    private readonly pairDataService: PairDataService,
    private readonly volume24hService: Volume24hService
  ) {}

  @Query((returns) => PairData)
  async pair(@Arg('pairAddress', (type) => String) pairAddress: string): Promise<Partial<PairData>> {
    const pairData = await this.pairDataService.getPair(pairAddress)
    if (!pairData) throw new Error('there are no transactions of this pair')
    return pairData as PairData
  }

  @Query((returns) => [PairData])
  async pairs(
    @Arg('pairAddresses', (type) => [String], { nullable: true }) pairAddresses?: string[]
  ): Promise<Partial<PairData>[]> {
    const pairData = await this.pairDataService.getPairs(pairAddresses)
    return pairData as PairData[]
  }

  @FieldResolver((type) => String)
  async commissionAPR(@Root() pairData: PairData): Promise<string> {
    return this.pairDataService.getCommissionAPR(pairData.pairAddress)
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

    const data = await this.pairDataService.getHistoricalData(pairData.pairAddress, from, to, cycle)
    if (!data) throw new Error('there are no transactions on pair: ' + pairData.pairAddress)
    
    return data
  }

  @FieldResolver((returns) => Volume24h)
  async volume24h(
    @Root() pairData: PairData
  ): Promise<Volume24h> {
    const pairAddress = pairData.pairAddress
    const result = await this.volume24hService.getVolume24h(pairAddress)
    if (!result) return
    return result
  }
}
