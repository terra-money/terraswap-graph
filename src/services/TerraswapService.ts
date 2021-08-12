import { Container, Service } from 'typedi'
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Recent24hEntity, TerraswapDayDataEntity } from 'orm'
import { TerraswapData, TerraswapHistoricalData } from 'graphql/schema/TerraswapDayData'
import { dateToNumber, numberToDate } from 'lib/utils'
import { Cycle } from 'types'

@Service()
export class TerraswapService {
  constructor(
    @InjectRepository(TerraswapDayDataEntity) private readonly terraswapRepo: Repository<TerraswapDayDataEntity>,
    @InjectRepository(Recent24hEntity) private readonly recent24hRepo: Repository<Recent24hEntity>
  ) {}

  async getTerraswapData(
    recent24hRepo = this.recent24hRepo,
    terraswapRepo = this.terraswapRepo
  ): Promise<Partial<TerraswapData>> {
    const latestData = await terraswapRepo.findOne({
      select: ['totalLiquidityUst'],
      order: { timestamp: 'DESC' },
    })

    const recent24hData = await recent24hRepo.find({
      select: ['volumeUst']
    })

    let voluem24h = 0

    for (const volume of recent24hData) {
      voluem24h += Number(volume.volumeUst)
    }

    return {
      volumeUST24h: voluem24h.toString(),
      liquidityUST: latestData.totalLiquidityUst
    }
  }

  async getTerraswapHistoricalData(from: number, to: number, repo = this.terraswapRepo): Promise<TerraswapHistoricalData[]> {
    const fromDate = numberToDate(from, Cycle.DAY)
    const toDate = numberToDate(to, Cycle.DAY)

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
