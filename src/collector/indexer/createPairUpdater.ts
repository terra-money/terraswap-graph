import { EntityManager } from 'typeorm'
import { PairInfoEntity, TokenInfoEntity } from 'orm'
import { isTokenOrderedWell } from 'lib/utils'
import { getTokenInfo } from 'lib/terra'

interface PairInfoTransformed {
  assets: string[]
  pairAddress: string
  lpTokenAddress: string
}

export async function addTokenInfo(
  tokenList: Record<string, boolean>,
  manager: EntityManager,
  tokenAddress: string,
  newPair: string
): Promise<TokenInfoEntity> {
  const tokenRepo = manager.getRepository(TokenInfoEntity)
  const token = await tokenRepo.findOne({ where: [{ tokenAddress }] })

  if (token === undefined) {
    // new one
    const tokenInfoFromBlockData = await getTokenInfo(tokenAddress)

    tokenList[tokenAddress] = true

    const tokenInfo = new TokenInfoEntity({
      tokenAddress,
      symbol: tokenInfoFromBlockData.symbol,
      pairs: [newPair],
      decimals: tokenInfoFromBlockData.decimals,
    })

    return tokenRepo.save(tokenInfo)
  } else {
    token.pairs = token.pairs.concat([newPair])
    return tokenRepo.save(token)
  }
}

export async function addPairInfo(
  pairList: Record<string, boolean>,
  manager: EntityManager,
  transformed: PairInfoTransformed
): Promise<PairInfoEntity> {
  const pairInfoRepo = manager.getRepository(PairInfoEntity)

  pairList[transformed.pairAddress] = true

  const token0 = isTokenOrderedWell(transformed.assets)
    ? transformed.assets[0]
    : transformed.assets[1]

  const token1 = isTokenOrderedWell(transformed.assets)
    ? transformed.assets[1]
    : transformed.assets[0]

  const pairInfo = new PairInfoEntity({
    pair: transformed.pairAddress,
    token0,
    token1,
    lpToken: transformed.lpTokenAddress,
  })

  return pairInfoRepo.save(pairInfo)
}
