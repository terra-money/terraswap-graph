import { EntityManager } from 'typeorm'
import {
  PairInfoEntity,
  ExchangeRateEntity,
  PairHourDataEntity,
  PairDayDataEntity,
  PairDataEntity,
  TerraswapDayDataEntity,
} from 'orm'
import { compareLiquidity, numberToDate, isNative } from 'lib/utils'
import { Cycle, Asset, ExchangeRate } from 'types'
import { getTokenPriceAsUST } from './common'

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
  timestamp: number,
  exchangeRate: ExchangeRate | undefined
): Promise<string> {
  //case1. uusd exist
  if (tokenReserve.token0 == 'uusd' || tokenReserve.token1 == 'uusd') {
    return tokenReserve.token0 == 'uusd'
      ? (Number(tokenReserve.token0Reserve) * 2).toString()
      : (Number(tokenReserve.token1Reserve) * 2).toString()
  }

  //case2. both are native: use asset0
  else if (isNative(tokenReserve.token0) && isNative(tokenReserve.token1)) {
    const token0Price = await getTokenPriceAsUST(
      manager,
      tokenReserve.token0,
      new Date(timestamp * 1000),
      exchangeRate
    )

    return (Number(token0Price.price) * Number(tokenReserve.token0Reserve) * 2).toString()
  }

  //case3. only one is native
  else if (isNative(tokenReserve.token0) || isNative(tokenReserve.token1)) {
    const nativeTokenIndex = isNative(tokenReserve.token0) ? 0 : 1

    const tokenPrice = await getTokenPriceAsUST(
      manager,
      nativeTokenIndex == 0 ? tokenReserve.token0 : tokenReserve.token1,
      new Date(timestamp * 1000),
      exchangeRate
    )

    const reserve = nativeTokenIndex == 0 ? tokenReserve.token0Reserve : tokenReserve.token1Reserve

    return (Number(tokenPrice.price) * Number(reserve) * 2).toString()
  }

  //case4. both are non-native
  else {
    const token0Price = await getTokenPriceAsUST(
      manager,
      tokenReserve.token0,
      new Date(timestamp * 1000),
      exchangeRate
    )

    const token1Price = await getTokenPriceAsUST(
      manager,
      tokenReserve.token1,
      new Date(timestamp * 1000),
      exchangeRate
    )

    return compareLiquidity(token0Price.liquidity, token1Price.liquidity)
      ? (Number(token0Price.price) * Number(tokenReserve.token0Reserve) * 2).toString()
      : (Number(token1Price.price) * Number(tokenReserve.token1Reserve) * 2).toString()
  }
}

export async function updateExchangeRate(
  manager: EntityManager,
  updatedReserve: Reserve,
  liquidity: string,
  timestamp: number,
  pair: string
): Promise<ExchangeRateEntity> {
  const exchangeRateRepo = manager.getRepository(ExchangeRateEntity)

  const lastRate = await exchangeRateRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  if (lastRate?.timestamp?.valueOf() === numberToDate(timestamp, Cycle.MINUTE).valueOf()) {
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
      timestamp: numberToDate(timestamp, Cycle.MINUTE),
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
  pair: string
): Promise<void> {
  await updateReserve(Cycle.HOUR, manager, updatedReserve, liquidity, pair)
  await updateReserve(Cycle.DAY, manager, updatedReserve, liquidity, pair)
}

export async function updateTotalLiquidity(
  manager: EntityManager
): Promise<TerraswapDayDataEntity[] | void> {
  const terraswapRepo = manager.getRepository(TerraswapDayDataEntity)
  const lastData = await terraswapRepo.find({
    order: { timestamp: 'DESC' },
    take: 2,
  })

  if (!lastData[0]) return undefined

  //now date
  const toDayLiquidities = await manager
    .createQueryBuilder()
    .select('liquidity_ust')
    .from(PairDayDataEntity, 'pair')
    .where('pair.timestamp <= :timestamp', { timestamp: lastData[0].timestamp })
    .distinctOn(['pair.pair'])
    .orderBy('pair.pair')
    .addOrderBy('pair.timestamp', 'DESC')
    .getRawMany()

  let sum = 0

  for (const liquidity of toDayLiquidities) {
    sum += Number(liquidity.liquidity_ust)
  }

  lastData[0].totalLiquidityUst = sum.toString()

  if (lastData[1]) {
    //last date
    const lastDayLiquidities = await manager
      .createQueryBuilder()
      .select('liquidity_ust')
      .from(PairDayDataEntity, 'pair')
      .where('pair.timestamp <= :timestamp', { timestamp: lastData[1].timestamp })
      .distinctOn(['pair.pair'])
      .orderBy('pair.pair')
      .addOrderBy('pair.timestamp', 'DESC')
      .getRawMany()

    sum = 0

    for (const liquidity of lastDayLiquidities) {
      sum += Number(liquidity.liquidity_ust)
    }

    lastData[1].totalLiquidityUst = sum.toString()
  }

  return terraswapRepo.save(lastData)
}

async function updateReserve(
  cycle: Cycle,
  manager: EntityManager,
  updatedReserve: Reserve,
  liquidity: string,
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

  if (!lastPairData) return

  lastPairData.token0Reserve = updatedReserve.token0Reserve
  lastPairData.token1Reserve = updatedReserve.token1Reserve
  lastPairData.liquidityUst = liquidity

  return pairRepo.save(lastPairData)
}

function changeInfinitePirceToZero(number0: string, number1: string): string {
  if (number1 === '0') return '0'
  return (Number(number0) / Number(number1)).toString()
}
