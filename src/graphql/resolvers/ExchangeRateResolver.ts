import { Arg, Query, Resolver } from 'type-graphql'
import { ExchangeRate } from 'graphql/schema'
import { ExchangeRateService } from 'services'
import { rangeLimit } from 'lib/utils'
import { Cycle } from 'types'

@Resolver((of) => ExchangeRate)
export class ExchangeRateResolver {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Query((returns) => ExchangeRate)
  async exchangeRate(
    @Arg('pairAddress') pairAddress: string,
    @Arg('from', { description: 'timestamp second' }) from: number,
    @Arg('to', { description: 'timestamp second' }) to: number,
    @Arg('interval', { description: 'unit: minute' }) interval: number
  ): Promise<ExchangeRate> {
    rangeLimit(from, to, interval, Cycle.MINUTE, 500)
    const exchangeRate = await this.exchangeRateService.exchangeRate(
      pairAddress,
      from,
      to,
      interval
    )
    if (!exchangeRate) throw new Error('there are no transactions of this pair')
    return exchangeRate
  }
}
