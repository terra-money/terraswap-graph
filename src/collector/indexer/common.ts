import { EntityManager, LessThanOrEqual } from 'typeorm'
import { isNative } from 'lib/utils'
import { exchangeRateToUST } from 'lib/terra'
import { PairDayDataEntity, PairInfoEntity, TokenInfoEntity } from 'orm'
import { ExchangeRate } from 'types'

interface UstPrice {
  price: string
  liquidity: string
}

// get token's UST price from token-UST pair that have the largest liquidity
export async function getTokenPriceAsUST(
  manager: EntityManager,
  token: string,
  timestamp: Date,
  exchangeRate: ExchangeRate | undefined
): Promise<UstPrice> {
  if (isNative(token))
    return { price: await exchangeRateToUST(token, exchangeRate), liquidity: 'native' }

  const pairInfoRepo = manager.getRepository(PairInfoEntity)
  const pairDayDataRepo = manager.getRepository(PairDayDataEntity)
  const matchedPair = await pairInfoRepo.find({
    where: { token0: 'uusd', token1: token },
  })

  let largestLiquidity = [0, 0] // liquidity, index

  if (matchedPair[0] !== undefined) {
    const pairData = []
    for (const pair of matchedPair) {
      const data = await pairDayDataRepo.findOne({
        where: { pair: pair.pair, timestamp: LessThanOrEqual(timestamp) },
        order: { timestamp: 'DESC' },
      })
      pairData.push(data)
    }

    if (pairData[0] == undefined) {
      return {
        price: '0',
        liquidity: '0',
      }
    }

    for (let i = 0; i < pairData.length; i++) {
      if (largestLiquidity[0] < Number(pairData[i].liquidityUst))
        largestLiquidity = [Number(pairData[i].liquidityUst), i]
    }

    const liquidityIndex = largestLiquidity[1]

    return {
      price: (
        Number(pairData[liquidityIndex].token0Reserve) /
        Number(pairData[liquidityIndex].token1Reserve)
      ).toString(),
      liquidity: pairData[liquidityIndex].liquidityUst,
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
