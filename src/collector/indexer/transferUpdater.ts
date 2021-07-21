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
import { Cycle, Asset } from 'types'
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
      token0: pairInfo.token_0,
      token0Reserve: '0',
      token1: pairInfo.token_1,
      token1Reserve: '0',
    }
  }

  return {
    token0: recentExchangeRate.token_0,
    token0Reserve: recentExchangeRate.token_0_reserve,
    token1: recentExchangeRate.token_1,
    token1Reserve: recentExchangeRate.token_1_reserve,
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
  timestamp: number
): Promise<string> {
  const token0Price = await tokenPriceAsUST(
    manager,
    tokenReserve.token0,
    new Date(timestamp * 1000)
  )

  const token1Price = await tokenPriceAsUST(
    manager,
    tokenReserve.token1,
    new Date(timestamp * 1000)
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
    lastRate.token_0_price = priceInfiniteToZero(
      updatedReserve.token1Reserve,
      updatedReserve.token0Reserve
    )

    lastRate.token_1_price = priceInfiniteToZero(
      updatedReserve.token0Reserve,
      updatedReserve.token1Reserve
    )

    lastRate.token_0_reserve = updatedReserve.token0Reserve
    lastRate.token_1_reserve = updatedReserve.token1Reserve
    lastRate.liquidity_ust = liquidity

    return exchangeRateRepo.save(lastRate)
  } else {
    const exchangeRate = new ExchangeRateEntity({
      timestamp: numberToDate(timestamp, Cycle.minute),
      pair: pair,
      token_0: updatedReserve.token0,
      token_0_price: priceInfiniteToZero(
        updatedReserve.token1Reserve,
        updatedReserve.token0Reserve
      ),
      token_0_reserve: updatedReserve.token0Reserve,
      token_1: updatedReserve.token1,
      token_1_price: priceInfiniteToZero(
        updatedReserve.token0Reserve,
        updatedReserve.token1Reserve
      ),
      token_1_reserve: updatedReserve.token1Reserve,
      liquidity_ust: liquidity,
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
  manager: EntityManager,
  timestamp: number
): Promise<TerraswapDayDataEntity | void> {
  const terraswapRepo = manager.getRepository(TerraswapDayDataEntity)
  const date = numberToDate(timestamp, Cycle.day)
  const liquidities = await manager
    .createQueryBuilder()
    .select('liquidity_ust')
    .from(PairDayDataEntity, 'pair')
    .where('pair.timestamp <= :timestamp', { timestamp: new Date(timestamp * 1000) })
    .distinctOn(['pair.pair'])
    .orderBy('pair.pair')
    .addOrderBy('pair.timestamp', 'DESC')
    .getRawMany()

  let sum = 0

  for (const liquidity of liquidities) {
    sum += Number(liquidity.liquidity_ust)
  }

  const lastData = await terraswapRepo.findOne({ where: [{ timestamp: date }] })

  if (!lastData) return

  lastData.total_liquidity_ust = sum.toString()
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

  lastPairData.token_0_reserve = updatedReserve.token0Reserve
  lastPairData.token_1_reserve = updatedReserve.token1Reserve
  lastPairData.liquidity_ust = liquidity

  return pairRepo.save(lastPairData)
}

function priceInfiniteToZero(number0: string, number1: string): string {
  if (number1 === '0') return '0'
  return (Number(number0) / Number(number1)).toString()
}
