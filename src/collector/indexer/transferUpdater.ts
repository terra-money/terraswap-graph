import { EntityManager } from 'typeorm'
import {
  PairInfoEntity,
  ExchangeRateEntity,
  PairHourDataEntity,
  PairDayDataEntity,
  PairDataEntity,
  TerraswapDayDataEntity,
} from 'orm'
import { liquidityCompare, numberToDate } from 'lib/utils'
import { Cycle, Asset, ExchangeRate } from 'types'
import { tokenPriceAsUST } from './common'

interface Reserve {
  token0: string
  token0Reserve: string
  token1: string
  token1Reserve: string
}

export async function latestReserve(manager: EntityManager, pair: string): Promise<Reserve> {
  const exchangeRateRepo = manager.getRepository(ExchangeRateEntity)

  const recentExchangeRate = await exchangeRateRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  if (!recentExchangeRate) {
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
    token0: recentExchangeRate.token0,
    token0Reserve: recentExchangeRate.token0Reserve,
    token1: recentExchangeRate.token1,
    token1Reserve: recentExchangeRate.token1Reserve,
  }
}

export function addingReserve(reserve: Reserve, transformedAsset: Asset): Reserve {
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

export async function liquidityUST(
  manager: EntityManager,
  tokenReserve: Reserve,
  timestamp: number,
  exchangeRate: ExchangeRate | undefined
): Promise<string> {
  const token0Price = await tokenPriceAsUST(
    manager,
    tokenReserve.token0,
    new Date(timestamp * 1000),
    exchangeRate
  )

  const token1Price = await tokenPriceAsUST(
    manager,
    tokenReserve.token1,
    new Date(timestamp * 1000),
    exchangeRate
  )

  return liquidityCompare(token0Price.liquidity, token1Price.liquidity)
    ? (Number(token0Price.price) * Number(tokenReserve.token0Reserve) * 2).toString()
    : (Number(token1Price.price) * Number(tokenReserve.token1Reserve) * 2).toString()
}

export async function updateExchangeRate(
  manager: EntityManager,
  updatedReserve: Reserve,
  liquidity: string,
  timestamp: number,
  pair: string
): Promise<ExchangeRateEntity> {
  console.log('updating exchange rate')
  const exchangeRateRepo = manager.getRepository(ExchangeRateEntity)

  const lastRate = await exchangeRateRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  if (lastRate?.timestamp?.valueOf() === numberToDate(timestamp, Cycle.minute).valueOf()) {
    lastRate.token0Price = priceInfiniteToZero(
      updatedReserve.token1Reserve,
      updatedReserve.token0Reserve
    )

    lastRate.token1Price = priceInfiniteToZero(
      updatedReserve.token0Reserve,
      updatedReserve.token1Reserve
    )

    lastRate.token0Reserve = updatedReserve.token0Reserve
    lastRate.token1Reserve = updatedReserve.token1Reserve
    lastRate.liquidityUst = liquidity

    return exchangeRateRepo.save(lastRate)
  } else {
    const exchangeRate = new ExchangeRateEntity({
      timestamp: numberToDate(timestamp, Cycle.minute),
      pair: pair,
      token0: updatedReserve.token0,
      token0Price: priceInfiniteToZero(updatedReserve.token1Reserve, updatedReserve.token0Reserve),
      token0Reserve: updatedReserve.token0Reserve,
      token1: updatedReserve.token1,
      token1Price: priceInfiniteToZero(updatedReserve.token0Reserve, updatedReserve.token1Reserve),
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
  await updateReserve(Cycle.hour, manager, updatedReserve, liquidity, pair)
  await updateReserve(Cycle.day, manager, updatedReserve, liquidity, pair)
}

export async function updateTotalLiquidity(
  manager: EntityManager
): Promise<TerraswapDayDataEntity | void> {
  const terraswapRepo = manager.getRepository(TerraswapDayDataEntity)
  const lastData = await terraswapRepo.findOne({ order: { timestamp: 'DESC' } })
  if (!lastData) return

  const timestamp = lastData.timestamp
  const liquidities = await manager
    .createQueryBuilder()
    .select('liquidity_ust')
    .from(PairDayDataEntity, 'pair')
    .where('pair.timestamp <= :timestamp', { timestamp: timestamp })
    .distinctOn(['pair.pair'])
    .orderBy('pair.pair')
    .addOrderBy('pair.timestamp', 'DESC')
    .getRawMany()

  let sum = 0

  for (const liquidity of liquidities) {
    sum += Number(liquidity.liquidity_ust)
  }

  lastData.totalLiquidityUst = sum.toString()
  return terraswapRepo.save(lastData)
}

async function updateReserve(
  cycle: Cycle,
  manager: EntityManager,
  updatedReserve: Reserve,
  liquidity: string,
  pair: string
): Promise<PairDataEntity | void> {
  console.log('updating reserve')
  const pairRepo = manager.getRepository(
    cycle === Cycle.hour ? PairHourDataEntity : PairDayDataEntity
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

function priceInfiniteToZero(number0: string, number1: string): string {
  if (number1 === '0') return '0'
  return (Number(number0) / Number(number1)).toString()
}
