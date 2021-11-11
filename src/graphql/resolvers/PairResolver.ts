import { Arg, FieldResolver, Query, Resolver, Root } from 'type-graphql'
import { Service } from 'typedi'
import { PairData, PairHistoricalData, Volume24h, Transaction } from 'graphql/schema'
import { PairDataService, Volume24hService } from 'services'
import { Cycle, Interval } from 'types'
import { floorDate, rangeLimit } from 'lib/utils'

@Service()
@Resolver((of) => PairData)
export class PairDataResolver {
  constructor(
    private readonly pairDataService: PairDataService,
    private readonly volume24hService: Volume24hService
  ) {}

  @Query((returns) => PairData)
  async pair(@Arg('pairAddress', (type) => String) pairAddress: string): Promise<Partial<PairData>> {
    const pair = await this.pairDataService.getPair(pairAddress)
    if (!pair) throw new Error('pair is not exist')
    return pair as PairData
  }

  @Query((returns) => [PairData])
  async pairs(
    @Arg('pairAddresses', (type) => [String], { nullable: true }) pairAddresses?: string[]
  ): Promise<Partial<PairData>[]> {
    return this.pairDataService.getPairs(pairAddresses)
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
    const cycle = interval === Interval.DAY ? Cycle.DAY : Cycle.HOUR
    from = floorDate(from, cycle)
    to = floorDate(to, cycle)
    const decimalDiff = pairData.token0.decimals - pairData.token1.decimals
    
    rangeLimit(from, to, cycle, 500)

    const data = await this.pairDataService.getHistoricalData(pairData.pairAddress, from, to, cycle, decimalDiff)
    
    return data
  }

  @FieldResolver((type) => [Transaction])
  async transactions(
    @Root() pairData: PairData,
    @Arg('limit') limit: number
  ): Promise<Transaction[]> {
    if (limit > 100) {
      throw new Error('limit must lesser than or equal to 100')
    }
    return this.pairDataService.getTransactions(pairData.pairAddress, limit)
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
