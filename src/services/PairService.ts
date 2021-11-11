import memoize from 'memoizee-decorator'
import { Container, Inject, Service } from 'typedi'
import { LessThanOrEqual, Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { PairDataEntity, PairDayDataEntity, PairHourDataEntity, PairInfoEntity, TokenInfoEntity, TxHistoryEntity } from 'orm'
import { dateToNumber, numberToDate } from 'lib/utils'
import { Cycle } from 'types'
import { TokenService } from './TokenService'
import { PairData, PairHistoricalData, Transaction, Token } from 'graphql/schema'
import { num } from 'lib/num'
import { whiteList } from 'assets/whiteList'

const whiteListPair: { [key: string]: string } = whiteList.pair

@Service()
export class PairDataService {
  constructor(
    @InjectRepository(PairInfoEntity) private readonly pairRepo: Repository<PairInfoEntity>,
    @InjectRepository(PairDayDataEntity) private readonly dayRepo: Repository<PairDayDataEntity>,
    @InjectRepository(PairHourDataEntity) private readonly hourRepo: Repository<PairHourDataEntity>,
    @InjectRepository(TokenInfoEntity) private readonly tokenRepo: Repository<TokenInfoEntity>,
    @InjectRepository(TxHistoryEntity) private readonly txRepo: Repository<TxHistoryEntity>,
    @Inject((type) => TokenService) private readonly tokenService: TokenService
  ) {}

  async getPairs(
    pairs: string[],
    pairRepo = this.pairRepo
  ): Promise<Partial<PairData>[]> {
    const result = []

    const pairsInfo = await pairRepo.find({
      order: { pair: 'DESC' }
    })

    if (!pairs){
      pairs = []
      for (const pairInfo of pairsInfo) {
        if(whiteListPair[pairInfo.pair]){
          pairs.push(pairInfo.pair)
        }
      }
    }

    const tokensInfo = await this.tokenRepo.find()

    const pairsLatest = await this.getLatestPairsData()
    
    for (const pair of pairs){
      // if pair exist
      if (pairsInfo.find((pairInfo) => pairInfo.pair === pair)) {
        const pairInfo = pairsInfo.find((pairInfo) => pairInfo.pair === pair)

        const token0Info = tokensInfo.find((tokenInfo) => tokenInfo.tokenAddress === pairInfo.token0)
        const token0: Token = {
          tokenAddress: pairInfo.token0,
          symbol: token0Info?.symbol,
          includedPairs: token0Info?.pairs,
          decimals: token0Info?.decimals,
        }

        const token1Info = tokensInfo.find((tokenInfo) => tokenInfo.tokenAddress === pairInfo.token1)
        const token1: Token = {
          tokenAddress: pairInfo.token1,
          symbol: token1Info?.symbol,
          includedPairs: token1Info?.pairs,
          decimals: token1Info?.decimals,
        }

        // token0 decimal - token1 decimal
        const decimalDiff = token0Info.decimals - token1Info.decimals
        
        const pairLatest = pairsLatest.find((pairLatest) => pairLatest.pair === pair)
        result.push({
          pairAddress: pair,
          token0,
          token1,
          latestToken0Price: pairLatest ? num(pairLatest.token1Reserve).div(pairLatest.token0Reserve).multipliedBy(10 ** decimalDiff).toFixed(10) : null,
          latestToken1Price: pairLatest ? num(pairLatest.token0Reserve).div(pairLatest.token1Reserve).div(10 ** decimalDiff).toFixed(10) : null,
          latestLiquidityUST: pairLatest ? pairLatest.liquidityUst : null,
          lpTokenAddress: pairInfo?.lpToken
        })
      }
    }

    return result
  }

  //10sec cache for high cost query
  @memoize({ promise: true, maxAge: 10000, primitive: true, length: 0 })
  async getLatestPairsData(): Promise<PairDayDataEntity[]> {
    return this.dayRepo
    .createQueryBuilder()
    .distinctOn(['pair'])
    .orderBy('pair')
    .addOrderBy('timestamp', 'DESC')
    .getMany()
  }
   

  async getPair(
    pair: string,
    pairRepo = this.pairRepo,
    dayRepo = this.dayRepo
  ): Promise<Partial<PairData>> {
    const pairInfo = await pairRepo.findOne({
      where: { pair }
    })

    if (!pairInfo || !whiteListPair[pair]) return undefined

    // pair: lpToken
    const lpToken = pairInfo.lpToken

    const latest = await dayRepo.findOne({
      where: { pair },
      order: { timestamp: 'DESC' },
    })

    const token0 = await this.tokenService.getToken(pairInfo.token0)
    const token1 = await this.tokenService.getToken(pairInfo.token1)

    const decimalDiff = token0.decimals - token1.decimals
  
    return {
      pairAddress: pair,
      token0,
      token1,
      latestToken0Price: latest ? num(latest.token1Reserve).div(latest.token0Reserve).multipliedBy(10 ** decimalDiff).toFixed(10) : null,
      latestToken1Price: latest ? num(latest.token0Reserve).div(latest.token1Reserve).div(10 ** decimalDiff).toFixed(10) : null,
      latestLiquidityUST: latest ? latest.liquidityUst : null,
      lpTokenAddress: lpToken
    }
  }

  @memoize({ promise: true, maxAge: 600000, primitive: true, length: 1 }) //10min
  async getCommissionAPR(pair: string, repo = this.hourRepo): Promise<string> {
    const now = new Date()
    const recent = new Date(now.valueOf() - 3.6e6)
    const sevenDaysBefore = new Date(recent.valueOf() - 6.048e8)
    const recentData = await repo.findOne({
      where: { pair, timestamp: LessThanOrEqual(recent) },
      order: { timestamp: 'DESC' },
    })

    const sevenDaysBeforeData = await repo.findOne({
      where: { pair, timestamp: LessThanOrEqual(sevenDaysBefore) },
      order: { timestamp: 'DESC' },
    })

    let commissionAPR = num(0)

    if (sevenDaysBeforeData) {
      const recentValue = getLpTokenValue(recentData)
      const oldValue = getLpTokenValue(sevenDaysBeforeData)
      commissionAPR = recentValue.minus(oldValue).multipliedBy(52.142857142857143).div(oldValue)
    }

    return commissionAPR.toString()
  }

  @memoize({ promise: true, maxAge: 60000, primitive: true, length: 4 })
  async getHistoricalData(
    pair: string,
    from: number,
    to: number,
    cycle: Cycle,
    decimalDiff: number,
    dayRepo = this.dayRepo,
    hourRepo = this.hourRepo
  ): Promise<PairHistoricalData[]> {
    const repo = cycle === Cycle.DAY ? dayRepo : hourRepo
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

    if (!pairData[0]) return []

    let indexTimestamp = dateToNumber(toDate)

    const pairHistory: PairHistoricalData[] = []

    for (const tick of pairData) {
      while (
        dateToNumber(tick.timestamp) <= indexTimestamp &&
        indexTimestamp >= dateToNumber(fromDate)
      ) {
        const isSameTick = dateToNumber(tick.timestamp) === indexTimestamp

        pairHistory.push({
          timestamp: indexTimestamp,
          token0Price: num(tick.token1Reserve).div(tick.token0Reserve).multipliedBy(10 ** decimalDiff).toFixed(10),
          token1Price: num(tick.token0Reserve).div(tick.token1Reserve).div(10 ** decimalDiff).toFixed(10),
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

    return pairHistory
  }

  async getTransactions(pair: string, limit: number): Promise<Transaction[]> {
    return this.txRepo
      .find({
        where: { pair },
        order: { timestamp: 'DESC' },
        take: limit
      })
      .then((recentTxns) => recentTxns.map((tx) => ({
        timestamp: dateToNumber(tx.timestamp),
        txHash: tx.tx_hash,
        action: tx.action,
        token0Amount: tx.token0Amount,
        token1Amount: tx.token1Amount
      })))
  }
}

export function pairDataService(): PairDataService {
  return Container.get(PairDataService)
}

function getLpTokenValue(data: PairDataEntity) {
  const token0Amount = num(data.token0Reserve)
  const token1Amount = num(data.token1Reserve)
  const totalLpTokenShare = num(data.totalLpTokenShare)
  return token0Amount.multipliedBy(token1Amount).squareRoot().div(totalLpTokenShare)
}
