import { Container, Inject, Service } from 'typedi'
import { LessThanOrEqual, Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { ExchangeRateEntity } from 'orm'
import { dateToNumber, numberToDate } from 'lib/utils'
import { Cycle } from 'types'
import { TokenService } from './TokenService'
import { ExchangeRate, Price } from 'graphql/schema'

@Service()
export class ExchangeRateService {
  constructor(
    @InjectRepository(ExchangeRateEntity) private readonly repo: Repository<ExchangeRateEntity>,
    @Inject((type) => TokenService) private readonly tokenService: TokenService
  ) {}

  async exchangeRate(
    pair: string,
    from = Date.now() / 1000,
    to = Date.now() / 1000,
    interval = 1,
    repo = this.repo
  ): Promise<void | ExchangeRate> {
    const fromDate = numberToDate(from, Cycle.minute)
    const toDate = numberToDate(to, Cycle.minute)

    let newFrom = await repo.findOne({
      select: ['timestamp'],
      order: { timestamp: 'DESC' },
      where: { timestamp: LessThanOrEqual(fromDate), pair },
    })

    if (!newFrom) {
      newFrom = await repo.findOne({
        order: { timestamp: 'ASC' },
        where: { pair },
      })
    }

    if (!newFrom) return //no data

    const exchangeRate = await repo
      .createQueryBuilder()
      .where('pair = :pair', { pair })
      .andWhere('timestamp <= :toDate', { toDate })
      .andWhere('timestamp >= :newFrom', { newFrom: newFrom.timestamp })
      .orderBy('timestamp', 'DESC')
      .getMany()

    if (!exchangeRate) return

    const token0 = await this.tokenService.getTokenInfo(exchangeRate[0].token0)
    const token1 = await this.tokenService.getTokenInfo(exchangeRate[0].token1)

    let indexTimestamp = dateToNumber(toDate)
    const prices: Price[] = []

    for (const tick of exchangeRate) {
      while (
        dateToNumber(tick.timestamp) <= indexTimestamp &&
        indexTimestamp >= dateToNumber(fromDate)
      ) {
        prices.push({
          timestamp: indexTimestamp,
          token0Price: tick.token0Price,
          token1Price: tick.token1Price,
          token0Reserve: tick.token0Reserve,
          token1Reserve: tick.token1Reserve,
          liquidityUST: tick.liquidityUst,
        })
        indexTimestamp -= interval * 60
      }
    }

    return {
      pairAddress: pair,
      token0,
      token1,
      prices,
    }
  }
}

export function exchangeRateService(): ExchangeRateService {
  return Container.get(ExchangeRateService)
}
