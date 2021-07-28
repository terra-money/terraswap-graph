import { Arg, Query, Resolver } from 'type-graphql'
import { ExchangeRate } from 'graphql/schema'
import { ExchangeRateService } from 'services'

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
    rangeLimit(from, to, interval, 500)
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

function rangeLimit(from: number, to: number, interval: number, limit: number) {
  if ((to - from) / (interval * 60) > limit)
    throw new Error(`max limit is '${limit}' set your range narrower or set larger interval`)
}
