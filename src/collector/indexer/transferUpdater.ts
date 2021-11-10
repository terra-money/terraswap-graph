import { EntityManager } from 'typeorm'
import {
  PairInfoEntity,
  ExchangeRateEntity,
  PairHourDataEntity,
  PairDayDataEntity,
  PairDataEntity,
  TerraswapDayDataEntity,
} from 'orm'
import { compareLiquidity, stringToDate, isNative } from 'lib/utils'
import { Cycle, Asset, ExchangeRate } from 'types'
import { getTokenPriceAsUST } from './common'
import { num } from 'lib/num'

interface Reserve {
  token0: string
  token0Reserve: string
  token1: string
  token1Reserve: string
}

export async function getLatestReserve(manager: EntityManager, pair: string): Promise<Reserve> {
  const pairDataRepo = manager.getRepository(PairDayDataEntity)

  const recentData = await pairDataRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  if (!recentData) {
    const pairInfoRepo = manager.getRepository(PairInfoEntity)

    const pairInfo = await pairInfoRepo.findOne({
      where: [{ pair }],
    })

    if (!pairInfo) {
      return {
        token0: '',
        token0Reserve: '',
        token1: '',
        token1Reserve: '',
      }
    }

    return {
      token0: pairInfo.token0,
      token0Reserve: '0',
      token1: pairInfo.token1,
      token1Reserve: '0',
    }
  }

  return {
    token0: recentData.token0,
    token0Reserve: recentData.token0Reserve,
    token1: recentData.token1,
    token1Reserve: recentData.token1Reserve,
  }
}

export function addReserve(reserve: Reserve, transformedAsset: Asset): Reserve {
  const token0Reserve =
    reserve.token0 === transformedAsset.token
      ? (Number(reserve.token0Reserve) + Number(transformedAsset.amount)).toString()
      : reserve.token0Reserve

  const token1Reserve =
    reserve.token1 === transformedAsset.token
      ? (Number(reserve.token1Reserve) + Number(transformedAsset.amount)).toString()
      : reserve.token1Reserve

  return {
    token0: reserve.token0,
    token0Reserve: token0Reserve,
    token1: reserve.token1,
    token1Reserve: token1Reserve,
  }
}

export async function getLiquidityAsUST(
  manager: EntityManager,
  tokenReserve: Reserve,
  timestamp: string,
  exchangeRate: ExchangeRate | undefined
): Promise<string> {
  //case1. uusd exist
  if (tokenReserve.token0 === 'uusd' || tokenReserve.token1 === 'uusd') {
    return tokenReserve.token0 === 'uusd'
      ? (Number(tokenReserve.token0Reserve) * 2).toString()
      : (Number(tokenReserve.token1Reserve) * 2).toString()
  }

  //case2. both are native: use asset0
  else if (isNative(tokenReserve.token0) && isNative(tokenReserve.token1)) {
    const token0Price = await getTokenPriceAsUST(
      manager,
      tokenReserve.token0,
      new Date(timestamp),
      exchangeRate
    )

    return num(token0Price.price)
      .multipliedBy(tokenReserve.token0Reserve)
      .multipliedBy(2)
      .toString()
  }

  //case3. only one is native
  else if (isNative(tokenReserve.token0) || isNative(tokenReserve.token1)) {
    const nativeTokenIndex = isNative(tokenReserve.token0) ? 0 : 1

    const tokenPrice = await getTokenPriceAsUST(
      manager,
      nativeTokenIndex === 0 ? tokenReserve.token0 : tokenReserve.token1,
      new Date(timestamp),
      exchangeRate
    )

    const reserve = nativeTokenIndex === 0 ? tokenReserve.token0Reserve : tokenReserve.token1Reserve

    return num(tokenPrice.price).multipliedBy(reserve).multipliedBy(2).toString()
  }

  //case4. both are non-native
  else {
    const token0Price = await getTokenPriceAsUST(
      manager,
      tokenReserve.token0,
      new Date(timestamp),
      exchangeRate
    )

    const token1Price = await getTokenPriceAsUST(
      manager,
      tokenReserve.token1,
      new Date(timestamp),
      exchangeRate
    )

    return compareLiquidity(token0Price.liquidity, token1Price.liquidity)
      ? num(token0Price.price).multipliedBy(tokenReserve.token0Reserve).multipliedBy(2).toString()
      : num(token1Price.price).multipliedBy(tokenReserve.token1Reserve).multipliedBy(2).toString()
  }
}

export async function updateExchangeRate(
  manager: EntityManager,
  updatedReserve: Reserve,
  liquidity: string,
  timestamp: string,
  pair: string
): Promise<ExchangeRateEntity> {
  const exchangeRateRepo = manager.getRepository(ExchangeRateEntity)

  const lastRate = await exchangeRateRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  if (lastRate?.timestamp?.valueOf() === stringToDate(timestamp, Cycle.MINUTE).valueOf()) {
    lastRate.token0Price = changeInfinitePirceToZero(
      updatedReserve.token1Reserve,
      updatedReserve.token0Reserve
    )

    lastRate.token1Price = changeInfinitePirceToZero(
      updatedReserve.token0Reserve,
      updatedReserve.token1Reserve
    )

    lastRate.token0Reserve = updatedReserve.token0Reserve
    lastRate.token1Reserve = updatedReserve.token1Reserve
    lastRate.liquidityUst = liquidity

    return exchangeRateRepo.save(lastRate)
  } else {
    const exchangeRate = new ExchangeRateEntity({
      timestamp: stringToDate(timestamp, Cycle.MINUTE),
      pair: pair,
      token0: updatedReserve.token0,
      token0Price: changeInfinitePirceToZero(
        updatedReserve.token1Reserve,
        updatedReserve.token0Reserve
      ),
      token0Reserve: updatedReserve.token0Reserve,
      token1: updatedReserve.token1,
      token1Price: changeInfinitePirceToZero(
        updatedReserve.token0Reserve,
        updatedReserve.token1Reserve
      ),
      token1Reserve: updatedReserve.token1Reserve,
      liquidityUst: liquidity,
    })
    return exchangeRateRepo.save(exchangeRate)
  }
}

export async function updateReserves(
  manager: EntityManager,
  updatedReserve: Reserve,
  liquidity: string,
  timestamp: string,
  pair: string
): Promise<void> {
  await updateReserve(Cycle.HOUR, manager, updatedReserve, liquidity, timestamp, pair)
  await updateReserve(Cycle.DAY, manager, updatedReserve, liquidity, timestamp,  pair)
}

export async function updateTerraswapData(
  manager: EntityManager
): Promise<TerraswapDayDataEntity[] | void> {
  const terraswapRepo = manager.getRepository(TerraswapDayDataEntity)
  const lastData = await terraswapRepo.find({
    order: { timestamp: 'DESC' },
    take: 2,
  })

  if (!lastData[0]) return undefined

  //now date
  const todayData = await manager
    .createQueryBuilder()
    .select(['liquidity_ust', 'volume_ust', 'txns', 'timestamp'])
    .from(PairDayDataEntity, 'pair')
    .where('pair.timestamp <= :timestamp', { timestamp: lastData[0].timestamp })
    .distinctOn(['pair.pair'])
    .orderBy('pair.pair')
    .addOrderBy('pair.timestamp', 'DESC')
    .getRawMany()

  let sum = {
    liuqidity: 0,
    volume: 0,
    txns: 0,
  }

  for (const data of todayData) {
    sum.liuqidity += Number(data.liquidity_ust)
    if (data.timestamp.valueOf() === lastData[0].timestamp.valueOf()){
      sum.volume += Number(data.volume_ust)
      sum.txns += data.txns
    }
  }

  lastData[0].totalLiquidityUst = sum.liuqidity.toString()
  lastData[0].volumeUst = sum.volume.toString()
  lastData[0].txns = sum.txns

  if (lastData[1]) {
    //last date
    const lastDayData = await manager
      .createQueryBuilder()
      .select(['liquidity_ust', 'volume_ust', 'txns', 'timestamp'])
      .from(PairDayDataEntity, 'pair')
      .where('pair.timestamp <= :timestamp', { timestamp: lastData[1].timestamp })
      .distinctOn(['pair.pair'])
      .orderBy('pair.pair')
      .addOrderBy('pair.timestamp', 'DESC')
      .getRawMany()

    sum = {
      liuqidity: 0,
      volume: 0,
      txns: 0,
    }

    for (const data of lastDayData) {
      sum.liuqidity += Number(data.liquidity_ust)
      if (data.timestamp.valueOf() === lastData[1].timestamp.valueOf()){
        sum.volume += Number(data.volume_ust)
        sum.txns += data.txns
      }
    }

    lastData[1].totalLiquidityUst = sum.liuqidity.toString()
    lastData[1].volumeUst = sum.volume.toString()
    lastData[1].txns = sum.txns
  }

  return terraswapRepo.save(lastData)
}

async function updateReserve(
  cycle: Cycle,
  manager: EntityManager,
  updatedReserve: Reserve,
  liquidity: string,
  timestamp: string,
  pair: string
): Promise<PairDataEntity | void> {
  const pairRepo = manager.getRepository(
    cycle === Cycle.HOUR ? PairHourDataEntity : PairDayDataEntity
  )

  const lastPairData = await pairRepo.findOne({
    // already exist on current timestamp by txns update
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  const txTime = stringToDate(timestamp, cycle)

  const isSame = txTime.valueOf() === lastPairData?.timestamp?.valueOf()

  if(isSame) {
    lastPairData.token0Reserve = updatedReserve.token0Reserve
    lastPairData.token1Reserve = updatedReserve.token1Reserve
    lastPairData.liquidityUst = liquidity
    return pairRepo.save(lastPairData)
  } else{
    //frist data
    if (lastPairData === undefined) {
      const pairInfoRepo = manager.getRepository(PairInfoEntity)
  
      const pairInfo = await pairInfoRepo.findOne({
        where: [{ pair }],
      })
  
      if (!pairInfo) return
  
      const pairData = new PairDayDataEntity({
        timestamp: txTime,
        pair,
        token0: pairInfo.token0,
        token0Volume: '0',
        token0Reserve: updatedReserve.token0Reserve,
        token1: pairInfo.token1,
        token1Volume: '0',
        token1Reserve: updatedReserve.token1Reserve,
        totalLpTokenShare: '0',
        volumeUst: '0',
        liquidityUst: liquidity,
        txns: 0,
      })
  
      return pairRepo.save(pairData)
    } else {
      const pairData = new PairDataEntity({
        timestamp: txTime,
        pair,
        token0: lastPairData.token0,
        token0Volume: '0',
        token0Reserve: updatedReserve.token0Reserve,
        token1: lastPairData.token1,
        token1Volume: '0',
        token1Reserve: updatedReserve.token1Reserve,
        totalLpTokenShare: lastPairData.totalLpTokenShare,
        volumeUst: '0',
        liquidityUst: liquidity,
        txns: 0,
      })

      return pairRepo.save(pairData)
    }
  }
}

function changeInfinitePirceToZero(number0: string, number1: string): string {
  if (number1 === '0') return '0'
  return num(number0).div(number1).toString()
}
