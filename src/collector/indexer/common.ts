import { EntityManager } from 'typeorm'
import { isNative } from 'lib/utils'
import { exchangeRateToUST } from 'lib/terra'
import { ExchangeRateEntity, PairInfoEntity, TokenInfoEntity } from 'orm'
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

  const ExchangeRates = await manager
    .createQueryBuilder()
    .from(ExchangeRateEntity, 'exchange')
    .where('exchange.timestamp <= :timestamp', { timestamp: timestamp })
    .andWhere('exchange.token_0 = :token0', { token0: 'uusd' })
    .andWhere('exchange.token_1 = :token1', { token1: token })
    .distinctOn(['exchange.pair'])
    .orderBy('exchange.pair')
    .addOrderBy('exchange.timestamp', 'DESC')
    .getRawMany()

  let largestLiquidity = [0, 0] // liquidity, index

  if (ExchangeRates[0] !== undefined) {
    for (let i = 0; i < ExchangeRates.length; i++) {
      if (largestLiquidity[0] < ExchangeRates[i].liquidityUST)
        largestLiquidity = [ExchangeRates[i].liquidityUST, i]
    }

    const liquidityIndex = largestLiquidity[1]

    return {
      price:
        ExchangeRates[liquidityIndex].token0 === token
          ? ExchangeRates[liquidityIndex].token0Price
          : ExchangeRates[liquidityIndex].token1Price,
      liquidity: ExchangeRates[liquidityIndex].liquidityUST,
    }
  } else {
    return {
      price: '0',
      liquidity: '0',
    }
  }
}

export async function getPairList(manager: EntityManager): Promise<string[]> {
  const pairInfoRepo = manager.getRepository(PairInfoEntity)
  const pairs = await pairInfoRepo.find({ select: ['pair'] })

  const pairList = []

  for (const i of pairs) {
    pairList.push(i.pair)
  }

  return pairList
}

export async function getTokenList(manager: EntityManager): Promise<string[]> {
  const tokenInforRepo = manager.getRepository(TokenInfoEntity)
  const tokens = await tokenInforRepo.find({ select: ['tokenAddress'] })

  const tokenList = []

  for (const i of tokens) {
    if (!isNative(i.tokenAddress)) tokenList.push(i.tokenAddress)
  }

  return tokenList
}
