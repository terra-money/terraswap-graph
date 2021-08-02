import { EntityManager } from 'typeorm'
import { PairInfoEntity, TokenInfoEntity } from 'orm'
import { tokenOrderedWell } from 'lib/utils'
import { getTokenInfo } from 'lib/terra'

interface PairInfoTransformed {
  assets: string[]
  pairAddress: string
  lpTokenAddress: string
}

export async function addTokenInfo(
  manager: EntityManager,
  tokenAddress: string,
  newPair: string
): Promise<TokenInfoEntity> {
  const tokenRepo = manager.getRepository(TokenInfoEntity)
  const token = await tokenRepo.findOne({ where: [{ tokenAddress }] })

  if (token === undefined) {
    // new one
    const tokenInfoFromBlockData = await getTokenInfo(tokenAddress)

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
  manager: EntityManager,
  transformed: PairInfoTransformed
): Promise<PairInfoEntity> {
  const pairInfoRepo = manager.getRepository(PairInfoEntity)

  const token0 = tokenOrderedWell(transformed.assets)
    ? transformed.assets[0]
    : transformed.assets[1]

  const token1 = tokenOrderedWell(transformed.assets)
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
