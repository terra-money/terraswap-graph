import { Container, Service } from 'typedi'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { TerraswapDayDataEntity } from 'orm'
import { TerraswapDay } from 'graphql/schema/TerraswapDayData'
import { dateToNumber, numberToDate } from 'lib/utils'
import { Cycle } from 'types'

@Service()
export class TerraswapService {
  constructor(
    @InjectRepository(TerraswapDayDataEntity)
    private readonly repo: Repository<TerraswapDayDataEntity>
  ) {}

  async getTerraswapData(
    from = Date.now(),
    to = Date.now(),
    repo = this.repo
  ): Promise<TerraswapDay[]> {
    const fromDate = numberToDate(from / 1000, Cycle.day)
    const toDate = numberToDate(to / 1000, Cycle.day)

    const terraswap = await repo
      .createQueryBuilder()
      .where('timestamp <= :toDate', { toDate })
      .andWhere('timestamp >= :fromDate', { fromDate })
      .orderBy('timestamp', 'DESC')
      .getMany()
    const returnList = []

    for (const day of terraswap) {
      returnList.push({
        timestamp: dateToNumber(day.timestamp),
        volumeUST: day.volumeUst,
        liquidityUST: day.totalLiquidityUst,
        txCount: day.txns,
      })
    }
    return returnList
  }
}

export function terraswapServie(): TerraswapService {
  return Container.get(TerraswapService)
}
