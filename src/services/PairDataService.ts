import { Container, Inject, Service } from 'typedi'
import { LessThanOrEqual, Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { PairDayDataEntity, PairHourDataEntity } from 'orm'
import { dateToNumber, numberToDate } from 'lib/utils'
import { Cycle } from 'types'
import { TokenService } from './TokenService'
import { PairData, PairHistoricalData } from 'graphql/schema'

@Service()
export class PairDataService {
  constructor(
    @InjectRepository(PairDayDataEntity) private readonly dayRepo: Repository<PairDayDataEntity>,
    @InjectRepository(PairHourDataEntity) private readonly hourRepo: Repository<PairHourDataEntity>,
    @Inject((type) => TokenService) private readonly tokenService: TokenService
  ) {}

  async getPairData(
    pair: string,
    from: number,
    to: number,
    cycle: Cycle,
    dayRepo = this.dayRepo,
    hourRepo = this.hourRepo
  ): Promise<void | PairData> {
    const repo = cycle == Cycle.DAY ? dayRepo : hourRepo

    const fromDate = numberToDate(from + cycle / 1000, cycle)
    const toDate = numberToDate(to, cycle)

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

    const pairData = await repo
      .createQueryBuilder()
      .where('pair = :pair', { pair })
      .andWhere('timestamp <= :toDate', { toDate })
      .andWhere('timestamp >= :newFrom', { newFrom: newFrom.timestamp })
      .orderBy('timestamp', 'DESC')
      .getMany()

    const latest = await repo.findOne({ order: { timestamp: 'DESC' } })

    if (!pairData[0]) return

    const token0 = await this.tokenService.getTokenInfo(pairData[0].token0)
    const token1 = await this.tokenService.getTokenInfo(pairData[0].token1)

    let indexTimestamp = dateToNumber(toDate)
    const pairHistory: PairHistoricalData[] = []

    for (const tick of pairData) {
      while (
        dateToNumber(tick.timestamp) <= indexTimestamp &&
        indexTimestamp >= dateToNumber(fromDate)
      ) {
        const isSameTick = dateToNumber(tick.timestamp) == indexTimestamp

        pairHistory.push({
          timestamp: indexTimestamp,
          token0Price: (Number(tick.token1Reserve) / Number(tick.token0Reserve)).toFixed(10),
          token1Price: (Number(tick.token0Reserve) / Number(tick.token1Reserve)).toFixed(10),
          token0Volume: isSameTick ? tick.token0Volume : '0',
          token1Volume: isSameTick ? tick.token1Volume : '0',
          token0Reserve: tick.token0Reserve,
          token1Reserve: tick.token1Reserve,
          totalLpTokenShare: tick.totalLpTokenShare,
          volumeUST: isSameTick ? tick.volumeUst : '0',
          liquidityUST: tick.liquidityUst,
          txCount: isSameTick ? tick.txns : 0,
        })
        indexTimestamp -= cycle / 1000
      }
    }

    return {
      pairAddress: pair,
      token0,
      token1,
      latestToken0Price: (Number(latest.token1Reserve) / Number(latest.token0Reserve)).toFixed(10),
      latestToken1Price: (Number(latest.token0Reserve) / Number(latest.token1Reserve)).toFixed(10),
      historicalData: pairHistory,
    }
  }
}

export function pairDataService(): PairDataService {
  return Container.get(PairDataService)
}
