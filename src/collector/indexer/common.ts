import { EntityManager } from 'typeorm'
import { isNative } from 'lib/utils'
import { exchangeRateToUST } from 'lib/terra'
import { PairDayDataEntity, PairInfoEntity, TokenInfoEntity } from 'orm'
import { ExchangeRate } from 'types'

interface UstPrice {
  price: string
  liquidity: string
}

// get token's UST price from token-UST pair that have the largest liquidity
export async function tokenPriceAsUST(
  manager: EntityManager,
  token: string,
  timestamp: Date,
  exchangeRate: ExchangeRate | undefined
): Promise<UstPrice> {
  if (isNative(token))
    return { price: await exchangeRateToUST(token, exchangeRate), liquidity: 'native' }

  const pairData = await manager
    .createQueryBuilder()
    .from(PairDayDataEntity, 'pair')
    .where('pair.timestamp <= :timestamp', { timestamp: timestamp })
    .andWhere('pair.token_0 = :token0', { token0: 'uusd' })
    .andWhere('pair.token_1 = :token1', { token1: token })
    .distinctOn(['pair.pair'])
    .orderBy('pair.pair')
    .addOrderBy('pair.timestamp', 'DESC')
    .getRawMany()

  let largestLiquidity = [0, 0] // liquidity, index

  if (pairData[0] !== undefined) {
    for (let i = 0; i < pairData.length; i++) {
      if (largestLiquidity[0] < pairData[i].liquidityUST)
        largestLiquidity = [pairData[i].liquidityUST, i]
    }

    const liquidityIndex = largestLiquidity[1]

    return {
      price: (
        Number(pairData[liquidityIndex].token_0_reserve) /
        Number(pairData[liquidityIndex].token_1_reserve)
      ).toString(),
      liquidity: pairData[liquidityIndex].liquidity_ust,
    }
  } else {
    return {
      price: '0',
      liquidity: '0',
    }
  }
}

export async function getPairList(manager: EntityManager): Promise<Record<string, boolean>> {
  const pairInfoRepo = manager.getRepository(PairInfoEntity)
  const pairs = await pairInfoRepo.find({ select: ['pair'] })

  const pairList: Record<string, boolean> = {}

  for (const i of pairs) {
    pairList[i.pair] = true
  }

  return pairList
}

export async function getTokenList(manager: EntityManager): Promise<Record<string, boolean>> {
  const tokenInforRepo = manager.getRepository(TokenInfoEntity)
  const tokens = await tokenInforRepo.find({ select: ['tokenAddress'] })

  const tokenList: Record<string, boolean> = {}

  for (const i of tokens) {
    if (!isNative(i.tokenAddress)) tokenList[i.tokenAddress] = true
  }

  return tokenList
}
